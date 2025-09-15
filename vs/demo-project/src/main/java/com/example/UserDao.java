package com.example;

import java.sql.*;
import java.util.List;
import java.util.ArrayList;

/**
 * User Data Access Object with intentional security issues for DevGuard demo
 */
public class UserDao {
    
    private Connection connection;
    private String password = "admin123"; // HARDCODED_PASSWORD - Critical issue
    
    public UserDao(Connection connection) {
        this.connection = connection;
    }
    
    /**
     * SQL Injection vulnerability - Critical issue
     */
    public User findUserById(String userId) throws SQLException {
        // SQL_INJECTION - Direct string concatenation
        String query = "SELECT * FROM users WHERE id = " + userId;
        Statement stmt = connection.createStatement();
        ResultSet rs = stmt.executeQuery(query);
        
        if (rs.next()) {
            return new User(rs.getString("id"), rs.getString("name"), rs.getString("email"));
        }
        return null;
    }
    
    /**
     * Another SQL injection with different pattern
     */
    public List<User> findUsersByName(String name) throws SQLException {
        List<User> users = new ArrayList<>();
        
        // SQL_INJECTION - String formatting vulnerability
        String sql = String.format("SELECT * FROM users WHERE name LIKE '%%%s%%'", name);
        Statement stmt = connection.createStatement();
        ResultSet rs = stmt.executeQuery(sql);
        
        while (rs.next()) {
            users.add(new User(rs.getString("id"), rs.getString("name"), rs.getString("email")));
        }
        
        return users;
    }
    
    /**
     * Weak cryptographic algorithm - High severity
     */
    public String hashPassword(String password) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5"); // WEAK_CRYPTO
            byte[] hash = md.digest(password.getBytes());
            StringBuilder hexString = new StringBuilder();
            
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            return hexString.toString();
        } catch (Exception e) {
            return password; // Fallback to plaintext - another security issue
        }
    }
    
    private String unusedField = "This field is never used"; // PMD: UnusedPrivateField
}