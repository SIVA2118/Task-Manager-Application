package com.taskmanager.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "subtasks")
public class SubTask {
    @Id
    private String id;
    private String taskId;
    private String title;
    private String username;
    private boolean completed = false;
    private String timing; // e.g. "10:00" or "15 mins"
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();
}
