package com.example;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cache service with concurrency issues for DevGuard demo
 */
public class CacheService {
    
    // THREAD_SAFETY - HashMap is not thread-safe
    private Map<String, Object> cache = new HashMap<>();
    
    private static CacheService instance;
    
    /**
     * Singleton pattern with thread safety issue
     */
    public static CacheService getInstance() {
        if (instance == null) { // THREAD_SAFETY - Double-checked locking issue
            instance = new CacheService();
        }
        return instance;
    }
    
    public void put(String key, Object value) {
        cache.put(key, value); // Concurrent modification possible
    }
    
    public Object get(String key) {
        return cache.get(key); // Concurrent read issue
    }
    
    public void clear() {
        cache.clear(); // Concurrent modification during iteration
    }
    
    /**
     * Method with high cyclomatic complexity - PMD issue
     */
    public String processComplexLogic(int type, String input, boolean flag1, boolean flag2, boolean flag3) {
        String result = "";
        
        if (type == 1) {
            if (flag1) {
                if (flag2) {
                    if (flag3) {
                        result = "Type1-All-True";
                    } else {
                        result = "Type1-Flag3-False";
                    }
                } else {
                    if (flag3) {
                        result = "Type1-Flag2-False-Flag3-True";
                    } else {
                        result = "Type1-Flag2-Flag3-False";
                    }
                }
            } else {
                result = "Type1-Flag1-False";
            }
        } else if (type == 2) {
            if (flag1 && flag2) {
                result = "Type2-Both-True";
            } else if (flag1 || flag2) {
                result = "Type2-One-True";
            } else {
                result = "Type2-Both-False";
            }
        } else if (type == 3) {
            result = input != null ? input.toUpperCase() : "NULL";
        } else {
            result = "Unknown-Type";
        }
        
        return result;
    }
}