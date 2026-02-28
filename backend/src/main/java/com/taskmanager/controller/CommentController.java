package com.taskmanager.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.taskmanager.model.Comment;
import com.taskmanager.repository.CommentRepository;
import com.taskmanager.security.services.UserDetailsImpl;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
public class CommentController {

    @Autowired
    CommentRepository commentRepository;

    private UserDetailsImpl getCurrentUser() {
        return (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<List<Comment>> getCommentsByTaskId(@PathVariable String taskId) {
        return new ResponseEntity<>(commentRepository.findByTaskId(taskId), HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<Comment> createComment(@PathVariable String taskId, @RequestBody Comment comment) {
        UserDetailsImpl userDetails = getCurrentUser();
        comment.setId(null); // Force mongo to generate new ID
        comment.setTaskId(taskId);
        comment.setUserId(userDetails.getId());
        comment.setUsername(userDetails.getUsername());
        return new ResponseEntity<>(commentRepository.save(comment), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteComment(@PathVariable String id) {
        commentRepository.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
