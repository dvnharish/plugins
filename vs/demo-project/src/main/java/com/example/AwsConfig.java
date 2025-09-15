package com.example;

/**
 * AWS configuration with hardcoded secrets for DevGuard demo
 */
public class AwsConfig {
    
    // AWS_ACCESS_KEY - Critical secret exposure
    private static final String AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
    private static final String AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    
    // DATABASE_PASSWORD - High severity secret
    private String dbPassword = "MySecretPassword123!";
    
    // API_KEY - Third party service key
    private String stripeApiKey = "sk_test_4eC39HqLyjWDarjtT1zdp7dc";
    
    public void configureAws() {
        // Using hardcoded credentials
        System.setProperty("aws.accessKeyId", AWS_ACCESS_KEY);
        System.setProperty("aws.secretKey", AWS_SECRET_KEY);
    }
    
    public String getDatabaseUrl() {
        // Hardcoded database connection with password
        return "jdbc:mysql://localhost:3306/mydb?user=admin&password=" + dbPassword;
    }
    
    public void processPayment() {
        // Using hardcoded API key
        String apiCall = "https://api.stripe.com/v1/charges?key=" + stripeApiKey;
        // ... payment processing logic
    }
}