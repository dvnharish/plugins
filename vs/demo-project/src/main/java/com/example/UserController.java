package com.example;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

/**
 * User Controller with intentional security issues for DevGuard demo
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * SECURITY ISSUE: Cross-Site Scripting (XSS) vulnerability
     * User input is directly written to response without escaping
     */
    @GetMapping("/search")
    public ResponseEntity<String> searchUsers(@RequestParam String query) {
        // VULNERABLE: Direct output of user input without escaping
        String result = "Search results for: " + query;
        return ResponseEntity.ok(result);
    }

    /**
     * SECURITY ISSUE: Information disclosure
     * Sensitive information exposed in error messages
     */
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        try {
            User user = userService.findUserById(id);
            if (user == null) {
                // VULNERABLE: Detailed error message exposes system information
                return ResponseEntity.badRequest()
                        .body(new User("Error: User not found in database table 'users' with ID: " + id));
            }
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            // VULNERABLE: Stack trace exposed to client
            return ResponseEntity.internalServerError()
                    .body(new User("Error: " + e.getMessage() + "\nStack trace: " + e.getStackTrace()));
        }
    }

    /**
     * SECURITY ISSUE: Missing authentication/authorization
     * No security checks for admin operations
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable String id) {
        // VULNERABLE: No authentication or authorization checks
        userService.deleteUser(id);
        return ResponseEntity.ok("User deleted successfully");
    }
}
