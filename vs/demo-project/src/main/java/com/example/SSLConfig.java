package com.example;

import javax.net.ssl.*;
import java.security.cert.X509Certificate;

/**
 * SSL Configuration with intentional security issues for DevGuard demo
 */
public class SSLConfig {
    
    /**
     * SECURITY ISSUE: Insecure TrustManager that accepts all certificates
     * This completely bypasses SSL certificate validation
     */
    public static SSLContext createInsecureSSLContext() {
        try {
            SSLContext sslContext = SSLContext.getInstance("TLS");
            
            // VULNERABLE: TrustManager that accepts all certificates
            TrustManager[] trustAllCerts = new TrustManager[] {
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() {
                        return null;
                    }
                    public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        // VULNERABLE: Accepts all client certificates
                    }
                    public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        // VULNERABLE: Accepts all server certificates
                    }
                }
            };
            
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            return sslContext;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create SSL context", e);
        }
    }
    
    /**
     * SECURITY ISSUE: Weak cipher suites
     */
    public static String[] getWeakCipherSuites() {
        return new String[] {
            "SSL_RSA_WITH_DES_CBC_SHA",
            "SSL_DHE_RSA_WITH_DES_CBC_SHA",
            "SSL_DHE_DSS_WITH_DES_CBC_SHA"
        };
    }
    
    /**
     * SECURITY ISSUE: Hardcoded SSL configuration
     */
    public static void configureSSL() {
        // VULNERABLE: Hardcoded SSL settings
        System.setProperty("https.protocols", "TLSv1");
        System.setProperty("javax.net.ssl.trustStore", "/path/to/truststore");
        System.setProperty("javax.net.ssl.trustStorePassword", "changeit");
    }
}
