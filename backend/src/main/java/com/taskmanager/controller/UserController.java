package com.taskmanager.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.taskmanager.model.User;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.services.UserDetailsImpl;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    UserRepository userRepository;

    private String getCurrentUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile() {
        return userRepository.findById(getCurrentUserId())
                .map(user -> {
                    user.setPassword(null); // Simple way to hide password
                    return ResponseEntity.ok(user);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateUserProfile(@RequestBody User profileDetails) {
        return userRepository.findById(getCurrentUserId())
                .map(user -> {
                    user.setFullName(profileDetails.getFullName());
                    user.setEmail(profileDetails.getEmail());
                    user.setBio(profileDetails.getBio());
                    user.setProfileImage(profileDetails.getProfileImage());
                    userRepository.save(user);
                    user.setPassword(null);
                    return ResponseEntity.ok(user);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
