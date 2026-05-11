use url::Url;

pub enum InterceptedRequest {
    /// Route to a mirror URL
    Mirror { url: String },
    /// Try P2P first with this content hash
    P2P { hash: String },
    /// Forward directly without interception
    Direct,
}

/// Check whether the given `action` string indicates mirror behaviour.
fn action_is_mirror(a: &str) -> bool {
    matches!(
        a.to_lowercase().as_str(),
        "mirror" | "镜像" | "镜像加速"
    )
}

/// Check whether the given `action` string indicates P2P behaviour.
fn action_is_p2p(a: &str) -> bool {
    matches!(
        a.to_lowercase().as_str(),
        "p2p" | "peer" | "p2p节点"
    )
}

/// Check whether the given `action` string means the request should be dropped / not proxied.
fn action_is_block(a: &str) -> bool {
    matches!(
        a.to_lowercase().as_str(),
        "block" | "deny" | "drop" | "拦截" | "阻止" | "拒绝"
    )
}

/// Evaluate user-defined rules from the in-memory cache.
///
/// Returns `Some(InterceptedRequest)` when a matching, enabled rule is found,
/// or `None` when no user rule matches — the caller should fall back to
/// hard-coded `KNOWN_HOSTS`.
fn eval_user_rules(host: &str) -> Option<InterceptedRequest> {
    let cache = crate::RULES_CACHE.read();
    if cache.is_empty() {
        return None;
    }

    // Rules are already sorted by priority in the cache.
    for rule in cache.iter() {
        if !rule.enabled {
            continue;
        }
        // Simple host matching: exact or subdomain.
        if host != rule.pattern && !host.ends_with(&format!(".{}", rule.pattern)) {
            continue;
        }

        let action_lower = rule.action.to_lowercase();

        if action_is_block(&action_lower) {
            // Blocked — we signal this by returning a special value.
            // For now, return Mirror with empty URL; the caller can interpret this.
            // TODO: add a Block variant to InterceptedRequest.
            return Some(InterceptedRequest::Direct);
        }

        if action_is_mirror(&action_lower) {
            // Fall through to KNOWN_HOSTS for the actual mirror URL.
            // The user rule just says "yes, intercept this host".
            return None;
        }

        if action_is_p2p(&action_lower) {
            // P2P with empty hash — try_p2p_fetch will fail, falling back to direct.
            return Some(InterceptedRequest::P2P {
                hash: String::new(),
            });
        }

        // Any other action (proxy, fallback, direct, etc.) → Direct
        return Some(InterceptedRequest::Direct);
    }

    None
}

/// Known AI package hosts that should be intercepted
const KNOWN_HOSTS: &[(&str, &[(&str, &str)])] = &[
    // pip / PyPI
    ("pypi.org", &[
        ("/simple", "https://pypi.tuna.tsinghua.edu.cn/simple"),
        ("/packages", "https://pypi.tuna.tsinghua.edu.cn/packages"),
    ]),
    ("files.pythonhosted.org", &[
        ("/packages", "https://pypi.tuna.tsinghua.edu.cn/packages"),
    ]),
    // conda
    ("repo.anaconda.com", &[
        ("/pkgs", "https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs"),
        ("/conda-forge", "https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge"),
    ]),
    ("conda.anaconda.org", &[
        ("/conda-forge", "https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge"),
        ("/pytorch", "https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/pytorch"),
    ]),
    // HuggingFace
    ("huggingface.co", &[
        ("/datasets", "https://hf-mirror.com/datasets"),
        ("/models", "https://hf-mirror.com/models"),
        ("/spaces", "https://hf-mirror.com/spaces"),
    ]),
    ("cdn-lfs.huggingface.co", &[
        ("/", "https://hf-mirror.com"),
    ]),
    // npm (for completeness)
    ("registry.npmjs.org", &[
        ("/", "https://registry.npmmirror.com"),
    ]),
    // Docker Hub
    ("registry-1.docker.io", &[
        ("/v2", "https://docker.mirrors.ustc.edu.cn/v2"),
    ]),
];

pub fn intercept_request(url_str: &str) -> InterceptedRequest {
    let url = match Url::parse(url_str) {
        Ok(u) => u,
        Err(_) => {
            // Try with https:// prefix
            match Url::parse(&format!("https://{}", url_str)) {
                Ok(u) => u,
                Err(_) => return InterceptedRequest::Direct,
            }
        }
    };

    let host = url.host_str().unwrap_or("");

    // 1. Check user-defined rules first (highest priority).
    if let Some(decision) = eval_user_rules(host) {
        return decision;
    }

    // 2. Fall back to hard-coded KNOWN_HOSTS for mirror URL resolution.
    for (known_host, routes) in KNOWN_HOSTS {
        if host == *known_host || host.ends_with(&format!(".{}", known_host)) {
            let path = url.path();

            for (prefix, mirror_base) in *routes {
                if path.starts_with(prefix) {
                    let remaining = &path[prefix.len()..];
                    let mirror_url = format!("{}{}", mirror_base, remaining);
                    if let Some(query) = url.query() {
                        return InterceptedRequest::Mirror {
                            url: format!("{}?{}", mirror_url, query),
                        };
                    }
                    return InterceptedRequest::Mirror { url: mirror_url };
                }
            }

            // Host matches but no specific route — still try to mirror
            if let Some((_, mirror_base)) = routes.first() {
                let mirror_url = format!("{}{}", mirror_base, url.path());
                if let Some(query) = url.query() {
                    return InterceptedRequest::Mirror {
                        url: format!("{}?{}", mirror_url, query),
                    };
                }
                return InterceptedRequest::Mirror { url: mirror_url };
            }
        }
    }

    InterceptedRequest::Direct
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pypi_interception() {
        let result = intercept_request("https://pypi.org/simple/requests/");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("tuna.tsinghua.edu.cn"));
                assert!(url.contains("requests"));
            }
            _ => panic!("Expected Mirror"),
        }
    }

    #[test]
    fn test_hf_interception() {
        let result = intercept_request("https://huggingface.co/models/bert-base-uncased/resolve/main/model.bin");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("hf-mirror.com"));
            }
            _ => panic!("Expected Mirror"),
        }
    }

    #[test]
    fn test_non_intercepted() {
        let result = intercept_request("https://google.com/search");
        match result {
            InterceptedRequest::Direct => {}
            _ => panic!("Expected Direct"),
        }
    }

    // ---- Extended test cases ----

    #[test]
    fn test_conda_interception() {
        let result = intercept_request("https://repo.anaconda.com/pkgs/main/linux-64/python-3.10.0.tar.bz2");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("tuna.tsinghua.edu.cn"));
                assert!(url.contains("anaconda"));
            }
            _ => panic!("Expected Mirror for conda"),
        }
    }

    #[test]
    fn test_conda_forge_interception() {
        let result = intercept_request("https://conda.anaconda.org/conda-forge/linux-64/numpy-1.21.0.tar.bz2");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("tuna.tsinghua.edu.cn"));
                assert!(url.contains("conda-forge"));
            }
            _ => panic!("Expected Mirror for conda-forge"),
        }
    }

    #[test]
    fn test_npm_interception() {
        let result = intercept_request("https://registry.npmjs.org/vue");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("npmmirror.com"));
            }
            _ => panic!("Expected Mirror for npm"),
        }
    }

    #[test]
    fn test_docker_interception() {
        let result = intercept_request("https://registry-1.docker.io/v2/library/nginx/manifests/latest");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("ustc.edu.cn"));
            }
            _ => panic!("Expected Mirror for Docker"),
        }
    }

    #[test]
    fn test_hf_cdn_interception() {
        let result = intercept_request("https://cdn-lfs.huggingface.co/repos/abc/model.bin");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("hf-mirror.com"));
            }
            _ => panic!("Expected Mirror for HF CDN"),
        }
    }

    #[test]
    fn test_pypi_with_query_string() {
        let result = intercept_request("https://pypi.org/simple/pip/?format=json");
        match result {
            InterceptedRequest::Mirror { url } => {
                assert!(url.contains("tuna.tsinghua.edu.cn"));
                assert!(url.contains("format=json"));
            }
            _ => panic!("Expected Mirror for pypi with query"),
        }
    }

    #[test]
    fn test_malformed_url_returns_direct() {
        // A malformed URL that's just a hostname with no scheme
        let result = intercept_request("not-a-url!!!!");
        match result {
            InterceptedRequest::Direct => {}
            _ => panic!("Expected Direct for malformed URL"),
        }
    }

    #[test]
    fn test_unknown_host_with_standard_port() {
        // Should not intercept random hosts even with standard ports
        let result = intercept_request("https://some-random-site.com:443/path");
        match result {
            InterceptedRequest::Direct => {}
            _ => panic!("Expected Direct for unknown host"),
        }
    }
}