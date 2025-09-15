package com.example;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * User Service with intentional issues for DevGuard demo
 */
public class UserService {
    
    // CONCURRENCY ISSUE: HashMap used in multi-threaded context
    private Map<String, User> userCache = new HashMap<>();
    
    // SECRETS ISSUE: Hardcoded credentials
    private String dbPassword = "admin123";
    private String apiKey = "sk-1234567890abcdef";
    
    private UserDao userDao;
    
    public UserService(UserDao userDao) {
        this.userDao = userDao;
    }
    
    /**
     * CONCURRENCY ISSUE: Race condition in counter
     */
    private int userCount = 0;
    
    public int getUserCount() {
        // VULNERABLE: Non-atomic operation on shared variable
        return userCount++;
    }
    
    /**
     * CONCURRENCY ISSUE: Unsafe cache operations
     */
    public User findUserById(String id) {
        // VULNERABLE: HashMap operations not thread-safe
        if (userCache.containsKey(id)) {
            return userCache.get(id);
        }
        
        User user = userDao.findUsersById(id).stream().findFirst().orElse(null);
        if (user != null) {
            userCache.put(id, user);
        }
        return user;
    }
    
    /**
     * STYLE ISSUE: Long method with multiple responsibilities
     */
    public User createUser(String name, String email, String phone, String address, 
                          String city, String state, String zipCode, String country) {
        // This method is too long and has too many parameters
        // It should be broken down into smaller methods
        
        // Validate input
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be empty");
        }
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        if (phone == null || phone.length() < 10) {
            throw new IllegalArgumentException("Invalid phone number");
        }
        if (address == null || address.trim().isEmpty()) {
            throw new IllegalArgumentException("Address cannot be empty");
        }
        if (city == null || city.trim().isEmpty()) {
            throw new IllegalArgumentException("City cannot be empty");
        }
        if (state == null || state.trim().isEmpty()) {
            throw new IllegalArgumentException("State cannot be empty");
        }
        if (zipCode == null || zipCode.length() < 5) {
            throw new IllegalArgumentException("Invalid zip code");
        }
        if (country == null || country.trim().isEmpty()) {
            throw new IllegalArgumentException("Country cannot be empty");
        }
        
        // Create user object
        User user = new User();
        user.setName(name.trim());
        user.setEmail(email.toLowerCase().trim());
        user.setPhone(phone);
        user.setAddress(address.trim());
        user.setCity(city.trim());
        user.setState(state.trim());
        user.setZipCode(zipCode);
        user.setCountry(country.trim());
        
        // Save to database (mock)
        // In real implementation, this would save to database
        System.out.println("Saving user: " + user.getName());
        
        return user;
    }
    
    public void deleteUser(String id) {
        // VULNERABLE: No validation or error handling
        userCache.remove(id);
        System.out.println("User deleted: " + id);
    }
    
    /**
     * STYLE ISSUE: Magic numbers
     */
    public boolean isUserActive(User user) {
        // VULNERABLE: Magic number should be a named constant
        return user.getLastLoginTime() > System.currentTimeMillis() - 86400 * 1000;
    }
}
