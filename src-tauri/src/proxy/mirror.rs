use std::collections::HashMap;
use std::time::{Duration, Instant};
use parking_lot::RwLock;

/// Mirror with latency tracking
#[derive(Debug, Clone)]
pub struct Mirror {
    pub name: String,
    pub base_url: String,
    pub latency_ms: u64,
    pub available: bool,
    pub last_checked: Instant,
}

impl Mirror {
    pub fn new(name: &str, base_url: &str) -> Self {
        Self {
            name: name.to_string(),
            base_url: base_url.to_string(),
            latency_ms: 0,
            available: true,
            last_checked: Instant::now(),
        }
    }
}

/// Mirror registry holds all known mirrors grouped by upstream host
pub struct MirrorRegistry {
    mirrors: RwLock<HashMap<String, Vec<Mirror>>>,
}

impl MirrorRegistry {
    pub fn new() -> Self {
        let mut map = HashMap::new();

        // PyPI mirrors
        map.insert("pypi.org".to_string(), vec![
            Mirror::new("Tsinghua", "https://pypi.tuna.tsinghua.edu.cn"),
            Mirror::new("Aliyun", "https://mirrors.aliyun.com/pypi"),
            Mirror::new("USTC", "https://pypi.mirrors.ustc.edu.cn"),
            Mirror::new("Tencent", "https://mirrors.cloud.tencent.com/pypi"),
        ]);

        // HuggingFace mirrors
        map.insert("huggingface.co".to_string(), vec![
            Mirror::new("HF Mirror", "https://hf-mirror.com"),
        ]);

        // npm mirrors
        map.insert("registry.npmjs.org".to_string(), vec![
            Mirror::new("npmmirror", "https://registry.npmmirror.com"),
        ]);

        Self {
            mirrors: RwLock::new(map),
        }
    }

    pub fn get_fastest_mirror(&self, host: &str, path: &str) -> Option<String> {
        let mirrors = self.mirrors.read();
        let candidates = mirrors.get(host)?;

        candidates
            .iter()
            .filter(|m| m.available)
            .min_by_key(|m| m.latency_ms)
            .map(|m| format!("{}{}", m.base_url, path))
    }

    pub async fn test_latency(&self, host: &str) {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(5))
            .build()
            .ok();

        let client = match client {
            Some(c) => c,
            None => return,
        };

        let mut mirrors = self.mirrors.write();
        if let Some(candidates) = mirrors.get_mut(host) {
            for mirror in candidates.iter_mut() {
                let start = Instant::now();
                match client.head(&mirror.base_url).send().await {
                    Ok(_) => {
                        mirror.latency_ms = start.elapsed().as_millis() as u64;
                        mirror.available = true;
                    }
                    Err(_) => {
                        mirror.available = false;
                    }
                }
                mirror.last_checked = Instant::now();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mirror_new() {
        let m = Mirror::new("Test", "https://test.example.com");
        assert_eq!(m.name, "Test");
        assert_eq!(m.base_url, "https://test.example.com");
        assert_eq!(m.latency_ms, 0);
        assert!(m.available);
    }

    #[test]
    fn test_get_fastest_mirror_pypi() {
        let registry = MirrorRegistry::new();
        let result = registry.get_fastest_mirror("pypi.org", "/simple/requests/");
        assert!(result.is_some());
        let url = result.unwrap();
        // Should come from one of the known mirrors
        assert!(
            url.contains("tuna.tsinghua.edu.cn")
                || url.contains("mirrors.aliyun.com")
                || url.contains("pypi.mirrors.ustc.edu.cn")
                || url.contains("mirrors.cloud.tencent.com")
        );
        assert!(url.contains("/simple/requests/"));
    }

    #[test]
    fn test_get_fastest_mirror_unknown_host() {
        let registry = MirrorRegistry::new();
        let result = registry.get_fastest_mirror("unknown-host.example.com", "/path");
        assert!(result.is_none());
    }

    #[test]
    fn test_get_fastest_mirror_huggingface() {
        let registry = MirrorRegistry::new();
        let result = registry.get_fastest_mirror("huggingface.co", "/models/bert-base-uncased");
        assert!(result.is_some());
        let url = result.unwrap();
        assert!(url.contains("hf-mirror.com"));
        assert!(url.contains("/models/bert-base-uncased"));
    }

    #[test]
    fn test_get_fastest_mirror_npm() {
        let registry = MirrorRegistry::new();
        let result = registry.get_fastest_mirror("registry.npmjs.org", "/vue");
        assert!(result.is_some());
    }
}