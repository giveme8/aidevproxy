use std::time::Instant;
use std::net::SocketAddr;

use tokio::net::TcpListener;
use tokio::sync::watch;
use tokio::task::JoinHandle;

pub struct ProxyServer {
    port: u16,
    shutdown_tx: Option<watch::Sender<bool>>,
    handle: Option<JoinHandle<()>>,
}

impl ProxyServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            shutdown_tx: None,
            handle: None,
        }
    }

    pub async fn start(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let addr: SocketAddr = format!("127.0.0.1:{}", self.port).parse()?;
        let listener = TcpListener::bind(addr).await?;
        let (shutdown_tx, shutdown_rx) = watch::channel(false);

        log::info!("Proxy server listening on {}", addr);

        let handle = tokio::spawn(async move {
            run_proxy(listener, shutdown_rx).await;
        });

        self.shutdown_tx = Some(shutdown_tx);
        self.handle = Some(handle);

        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(true);
        }
        if let Some(handle) = self.handle.take() {
            let _ = tokio::time::timeout(std::time::Duration::from_secs(5), handle).await;
        }
        log::info!("Proxy server stopped");
        Ok(())
    }
}

async fn run_proxy(listener: TcpListener, mut shutdown_rx: watch::Receiver<bool>) {
    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, addr)) => {
                        log::debug!("Accepted connection from {}", addr);
                        tokio::spawn(async move {
                            if let Err(e) = handle_connection(stream).await {
                                log::error!("Connection error from {}: {}", addr, e);
                            }
                        });
                    }
                    Err(e) => {
                        log::error!("Accept error: {}", e);
                    }
                }
            }
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    log::info!("Shutting down proxy server");
                    break;
                }
            }
        }
    }
}

async fn handle_connection(mut stream: tokio::net::TcpStream) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use tokio::io::AsyncReadExt;
    use bytes::BytesMut;

    let mut buf = BytesMut::with_capacity(8192);
    let mut temp_buf = vec![0u8; 8192];

    // Read the initial request
    let n = stream.read(&mut temp_buf).await?;
    if n == 0 {
        return Ok(());
    }
    buf.extend_from_slice(&temp_buf[..n]);

    let request_str = String::from_utf8_lossy(&buf);

    // Check if this is a CONNECT request (HTTPS)
    if request_str.starts_with("CONNECT") {
        handle_connect(stream, &request_str, buf.to_vec()).await?;
    } else {
        handle_http(stream, &request_str, buf.to_vec()).await?;
    }

    Ok(())
}

use super::interceptor::{InterceptedRequest, intercept_request};

async fn handle_http(
    mut stream: tokio::net::TcpStream,
    request_str: &str,
    _initial_data: Vec<u8>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use tokio::io::AsyncWriteExt;

    let start = Instant::now();
    // Parse the request to determine target
    let first_line = request_str.lines().next().unwrap_or("");
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    if parts.len() < 2 {
        return Err("Invalid HTTP request".into());
    }

    let url_str = parts[1];
    let intercepted = intercept_request(url_str);

    let (_resolved_url, mode, source) = match &intercepted {
        InterceptedRequest::Mirror { url } => {
            (url.clone(), "Mirrored".to_string(), url.clone())
        }
        InterceptedRequest::P2P { .. } => {
            (url_str.to_string(), "P2P".to_string(), url_str.to_string())
        }
        InterceptedRequest::Direct => {
            (url_str.to_string(), "Direct".to_string(), url_str.to_string())
        }
    };

    let response_size: usize;
    let status: u32;

    match intercepted {
        InterceptedRequest::Mirror { url: mirror_url } => {
            match fetch_from_url(&mirror_url).await {
                Ok(response) => {
                    response_size = response.len();
                    status = 200;
                    stream.write_all(&response).await?;
                }
                Err(_) => {
                    status = 502;
                    response_size = 0;
                }
            }
        }
        InterceptedRequest::P2P { hash } => {
            if let Some(data) = try_p2p_fetch(&hash).await {
                response_size = data.len();
                status = 200;
                stream.write_all(&data).await?;
            } else {
                match fetch_from_url(url_str).await {
                    Ok(response) => {
                        response_size = response.len();
                        status = 200;
                        stream.write_all(&response).await?;
                    }
                    Err(_) => {
                        status = 502;
                        response_size = 0;
                    }
                }
            }
        }
        InterceptedRequest::Direct => {
            match fetch_from_url(url_str).await {
                Ok(response) => {
                    response_size = response.len();
                    status = 200;
                    stream.write_all(&response).await?;
                }
                Err(_) => {
                    status = 502;
                    response_size = 0;
                }
            }
        }
    }

    let elapsed = start.elapsed().as_millis() as u32;

    // Determine tool from host
    let host = get_host(url_str);
    let tool = classify_tool(&host);

    crate::traffic::record(crate::traffic::TrafficEntry {
        time: chrono::Local::now().format("%H:%M:%S").to_string(),
        tool,
        host,
        path: get_path(url_str),
        mode,
        source,
        size: format_bytes(response_size),
        latency: elapsed,
        status,
    });

    Ok(())
}

fn get_host(url_str: &str) -> String {
    url::Url::parse(url_str)
        .ok()
        .and_then(|u| u.host_str().map(String::from))
        .unwrap_or_else(|| url_str.to_string())
}

fn get_path(url_str: &str) -> String {
    url::Url::parse(url_str)
        .ok()
        .map(|u| u.path().to_string())
        .unwrap_or_else(|| "/".into())
}

fn classify_tool(host: &str) -> String {
    if host.contains("pypi.org") || host.contains("pythonhosted.org") {
        "pip".into()
    } else if host.contains("npmjs.org") || host.contains("npmmirror.com") {
        "npm".into()
    } else if host.contains("huggingface.co") || host.contains("hf-mirror.com") {
        "huggingface".into()
    } else if host.contains("docker.io") || host.contains("docker.") {
        "docker".into()
    } else if host.contains("anaconda.") || host.contains("conda.") {
        "conda".into()
    } else {
        "other".into()
    }
}

fn format_bytes(bytes: usize) -> String {
    if bytes >= 1_048_576 {
        format!("{:.1} MB", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}

async fn handle_connect(
    mut client_stream: tokio::net::TcpStream,
    request_str: &str,
    _initial_data: Vec<u8>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use tokio::io::AsyncWriteExt;

    // Parse CONNECT host:port
    let first_line = request_str.lines().next().unwrap_or("");
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    if parts.len() < 2 {
        return Err("Invalid CONNECT request".into());
    }

    let target = parts[1]; // host:port

    // Connect to the upstream server
    match tokio::net::TcpStream::connect(target).await {
        Ok(server_stream) => {
            // Send 200 Connection Established
            client_stream.write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n").await?;

            // Bidirectional copy
            let (mut cr, mut cw) = client_stream.into_split();
            let (mut sr, mut sw) = server_stream.into_split();

            let client_to_server = tokio::spawn(async move {
                tokio::io::copy(&mut cr, &mut sw).await
            });
            let server_to_client = tokio::spawn(async move {
                tokio::io::copy(&mut sr, &mut cw).await
            });

            let _ = tokio::try_join!(client_to_server, server_to_client);
        }
        Err(e) => {
            client_stream.write_all(b"HTTP/1.1 502 Bad Gateway\r\n\r\n").await?;
            return Err(e.into());
        }
    }

    Ok(())
}

async fn fetch_from_url(url_str: &str) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()?;

    let response = client.get(url_str).send().await?;
    let bytes = response.bytes().await?;
    Ok(bytes.to_vec())
}

async fn try_p2p_fetch(hash: &str) -> Option<Vec<u8>> {
    // Clone the Arc to avoid holding the lock across await
    let network_arc = {
        let network = crate::commands::P2P_NETWORK.lock();
        network.clone()
    };
    if let Some(net) = network_arc {
        net.fetch_content(hash).await
    } else {
        None
    }
}