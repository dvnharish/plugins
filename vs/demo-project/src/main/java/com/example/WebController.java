package com.example;

import org.springframework.web.bind.annotation.*;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Web controller with XSS vulnerabilities for DevGuard demo
 */
@RestController
@RequestMapping("/api")
public class WebController {
    
    private UserDao userDao;
    
    public WebController(UserDao userDao) {
        this.userDao = userDao;
    }
    
    /**
     * XSS vulnerability - user input rendered without escaping
     */
    @GetMapping("/user/{id}")
    public void getUserProfile(@PathVariable String id, HttpServletResponse response) throws IOException {
        try {
            User user = userDao.findUserById(id);
            if (user != null) {
                // XSS_VULNERABILITY - Direct output without escaping
                response.getWriter().write("<h1>Welcome " + user.getName() + "</h1>");
                response.getWriter().write("<p>Email: " + user.getEmail() + "</p>");
            } else {
                // XSS_VULNERABILITY - Reflecting user input
                response.getWriter().write("<p>User with ID " + id + " not found</p>");
            }
        } catch (Exception e) {
            // Poor error handling - information disclosure
            response.getWriter().write("Error: " + e.getMessage());
        }
    }
    
    /**
     * Path traversal vulnerability
     */
    @GetMapping("/file/{filename}")
    public String readFile(@PathVariable String filename) {
        try {
            // PATH_TRAVERSAL - No validation of filename
            java.nio.file.Path path = java.nio.file.Paths.get("/app/files/" + filename);
            return new String(java.nio.file.Files.readAllBytes(path));
        } catch (Exception e) {
            return "File not found: " + filename; // Information disclosure
        }
    }
    
    /**
     * Insecure direct object reference
     */
    @PostMapping("/admin/delete/{userId}")
    public String deleteUser(@PathVariable String userId) {
        // IDOR - No authorization check
        try {
            // Simulate user deletion
            return "User " + userId + " deleted successfully";
        } catch (Exception e) {
            return "Failed to delete user: " + e.getMessage();
        }
    }
}