package com.taskmanager.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.taskmanager.model.Attachment;
import com.taskmanager.repository.AttachmentRepository;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tasks/{taskId}/attachments")
public class AttachmentController {

    @Autowired
    AttachmentRepository attachmentRepository;

    @GetMapping
    public ResponseEntity<List<Attachment>> getAttachmentsByTaskId(@PathVariable String taskId) {
        return new ResponseEntity<>(attachmentRepository.findByTaskId(taskId), HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<Attachment> createAttachment(@PathVariable String taskId, @RequestBody Attachment attachment) {
        attachment.setId(null); // Force mongo to generate new ID
        attachment.setTaskId(taskId);
        return new ResponseEntity<>(attachmentRepository.save(attachment), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteAttachment(@PathVariable String id) {
        attachmentRepository.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
