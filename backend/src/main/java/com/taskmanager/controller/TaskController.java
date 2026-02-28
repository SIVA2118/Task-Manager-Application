package com.taskmanager.controller;

import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.taskmanager.model.Task;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.SubTaskRepository;
import com.taskmanager.repository.CommentRepository;
import com.taskmanager.repository.AttachmentRepository;
import com.taskmanager.security.services.UserDetailsImpl;
import com.taskmanager.model.SubTask;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    TaskRepository taskRepository;

    @Autowired
    SubTaskRepository subTaskRepository;

    @Autowired
    CommentRepository commentRepository;

    @Autowired
    AttachmentRepository attachmentRepository;

    private String getCurrentUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        try {
            String userId = getCurrentUserId();
            List<Task> tasks = taskRepository.findByUserId(userId);
            if (tasks.isEmpty()) {
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            }
            tasks.forEach(this::populateTaskCounts);
            return new ResponseEntity<>(tasks, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void populateTaskCounts(Task task) {
        String taskId = task.getId();
        List<SubTask> taskSubtasks = subTaskRepository.findByTaskId(taskId);
        task.setSubtasks(taskSubtasks);

        task.setSubtaskCount(taskSubtasks.size());
        task.setCommentCount(commentRepository.findByTaskId(taskId).size());
        task.setAttachmentCount(attachmentRepository.findByTaskId(taskId).size());
        
        long completedCount = taskSubtasks.stream()
                .filter(SubTask::isCompleted)
                .count();
        task.setCompletedSubtaskCount(completedCount);
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@RequestBody Task task) {
        try {
            String userId = getCurrentUserId();
            task.setUserId(userId);
            // Ensure reminderTime is set if reminder is true
            if (Boolean.TRUE.equals(task.getReminder()) && task.getReminderTime() == null) {
                task.setReminderTime(task.getDueDate());
            }
            Task _task = taskRepository.save(task);
            return new ResponseEntity<>(_task, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable("id") String id, @RequestBody Task task) {
        Optional<Task> taskData = taskRepository.findById(id);
        
        if (taskData.isPresent()) {
            Task _task = taskData.get();
            // Validate that current user owns the task
            if (!_task.getUserId().equals(getCurrentUserId())) {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }

            _task.setTitle(task.getTitle());
            _task.setDescription(task.getDescription());
            _task.setDueDate(task.getDueDate());
            _task.setPriority(task.getPriority());
            _task.setStatus(task.getStatus());
            _task.setReminder(task.getReminder());
            
            if (Boolean.TRUE.equals(task.getReminder())) {
                _task.setReminderTime(task.getReminderTime() != null ? task.getReminderTime() : task.getDueDate());
            } else {
                _task.setReminderTime(null);
            }
            
            return new ResponseEntity<>(taskRepository.save(_task), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteTask(@PathVariable("id") String id) {
        try {
            Optional<Task> taskData = taskRepository.findById(id);
            if (taskData.isPresent()) {
                Task task = taskData.get();
                if (!task.getUserId().equals(getCurrentUserId())) {
                    return new ResponseEntity<>(HttpStatus.FORBIDDEN);
                }
                taskRepository.deleteById(id);
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
