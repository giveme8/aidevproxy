use std::collections::HashMap;
use std::path::PathBuf;
use parking_lot::RwLock;
use sha2::{Sha256, Digest};

/// Local package cache
pub struct PackageCache {
    cache_dir: PathBuf,
    index: RwLock<HashMap<String, CachedPackage>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CachedPackage {
    pub hash: String,
    pub original_url: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub created_at: u64,
}

impl PackageCache {
    pub fn new() -> Self {
        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("/tmp"))
            .join("aidev-proxy");

        std::fs::create_dir_all(&cache_dir).ok();

        Self {
            cache_dir,
            index: RwLock::new(HashMap::new()),
        }
    }

    #[cfg(test)]
    pub fn with_dir(cache_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&cache_dir).ok();
        Self {
            cache_dir,
            index: RwLock::new(HashMap::new()),
        }
    }

    pub fn compute_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex::encode(hasher.finalize())
    }

    pub fn get(&self, hash: &str) -> Option<Vec<u8>> {
        let index = self.index.read();
        if let Some(pkg) = index.get(hash) {
            let path = self.cache_dir.join(&pkg.file_name);
            std::fs::read(path).ok()
        } else {
            None
        }
    }

    pub fn store(&self, data: &[u8], original_url: &str) -> String {
        let hash = Self::compute_hash(data);
        let file_name = format!("{}.pkg", &hash[..16]);

        let path = self.cache_dir.join(&file_name);
        if !path.exists() {
            if let Err(e) = std::fs::write(&path, data) {
                eprintln!("DEBUG store write error: {:?} path={:?}", e, path);
            }
        }

        let pkg = CachedPackage {
            hash: hash.clone(),
            original_url: original_url.to_string(),
            file_name,
            size_bytes: data.len() as u64,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };

        self.index.write().insert(hash.clone(), pkg);
        hash
    }

    pub fn get_size_bytes(&self) -> u64 {
        let index = self.index.read();
        index.values().map(|p| p.size_bytes).sum()
    }

    pub fn clear(&self) {
        self.index.write().clear();
        let _ = std::fs::remove_dir_all(&self.cache_dir);
        let _ = std::fs::create_dir_all(&self.cache_dir);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_hash_is_deterministic() {
        let data = b"hello world";
        let hash1 = PackageCache::compute_hash(data);
        let hash2 = PackageCache::compute_hash(data);
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA-256 hex output
    }

    #[test]
    fn test_compute_hash_different_data() {
        let hash_a = PackageCache::compute_hash(b"aaa");
        let hash_b = PackageCache::compute_hash(b"bbb");
        assert_ne!(hash_a, hash_b);
    }

    #[test]
    fn test_store_and_get() {
        let cache = PackageCache::new();
        eprintln!("DEBUG cache_dir: {:?}", cache.cache_dir);
        eprintln!("DEBUG cache_dir exists: {}", cache.cache_dir.exists());
        let data = b"cached content";
        let hash = cache.store(data, "https://example.com/package.tar.gz");
        eprintln!("DEBUG hash: {}", hash);
        eprintln!("DEBUG file_name: {}.pkg", &hash[..16]);
        eprintln!("DEBUG full_path: {:?}", cache.cache_dir.join(format!("{}.pkg", &hash[..16])));
        eprintln!("DEBUG full_path exists: {}", cache.cache_dir.join(format!("{}.pkg", &hash[..16])).exists());

        assert!(!hash.is_empty());
        let index_has = cache.index.read().contains_key(&hash);
        eprintln!("DEBUG index contains hash: {}", index_has);
        let retrieved = cache.get(&hash);
        eprintln!("DEBUG retrieved.is_some(): {}", retrieved.is_some());
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), data);
    }

    #[test]
    fn test_get_nonexistent_hash() {
        let cache = PackageCache::new();
        let result = cache.get("nonexistent_hash");
        assert!(result.is_none());
    }

    #[test]
    fn test_get_size_bytes() {
        let cache = PackageCache::new();
        assert_eq!(cache.get_size_bytes(), 0);

        cache.store(b"1234567890", "url1"); // 10 bytes
        cache.store(b"12345678901234567890", "url2"); // 20 bytes
        assert_eq!(cache.get_size_bytes(), 30);
    }

    #[test]
    fn test_clear() {
        let cache = PackageCache::new();
        let hash = cache.store(b"some data", "url");
        assert!(cache.get(&hash).is_some());
        assert!(cache.get_size_bytes() > 0);

        cache.clear();
        // After clear, data should be gone
        let result = cache.get(&hash);
        // clear removes the cache directory and recreates it;
        // the index is cleared, so get should return None
        assert!(result.is_none());
    }
}