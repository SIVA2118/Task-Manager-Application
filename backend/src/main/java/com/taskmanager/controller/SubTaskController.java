package com.taskmanager.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.taskmanager.model.SubTask;
import com.taskmanager.repository.SubTaskRepository;
import com.taskmanager.security.services.UserDetailsImpl;
import org.springframework.security.core.context.SecurityContextHolder;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tasks/{taskId}/subtasks")
public class SubTaskController {

    @Autowired
    SubTaskRepository subTaskRepository;

    private String getCurrentUsername() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getUsername();
    }

    @GetMapping
    public ResponseEntity<List<SubTask>> getSubTasksByTaskId(@PathVariable String taskId) {
        return new ResponseEntity<>(subTaskRepository.findByTaskId(taskId), HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<SubTask> createSubTask(@PathVariable String taskId, @RequestBody SubTask subTask) {
        subTask.setId(null); // Force mongo to generate new ID
        subTask.setTaskId(taskId);
        subTask.setUsername(getCurrentUsername());
        return new ResponseEntity<>(subTaskRepository.save(subTask), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubTask> updateSubTask(@PathVariable String id, @RequestBody SubTask subTask) {
        return subTaskRepository.findById(id)
                .map(existingSubTask -> {
                    existingSubTask.setTitle(subTask.getTitle());
                    existingSubTask.setCompleted(subTask.isCompleted());
                    existingSubTask.setTiming(subTask.getTiming());
                    return new ResponseEntity<>(subTaskRepository.save(existingSubTask), HttpStatus.OK);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteSubTask(@PathVariable String id) {
        subTaskRepository.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
