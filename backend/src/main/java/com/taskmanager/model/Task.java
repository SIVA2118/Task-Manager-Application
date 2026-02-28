package com.taskmanager.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

import org.springframework.data.annotation.Transient;
import java.util.List;
import java.util.ArrayList;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tasks")
public class Task {
    @Id
    private String id;

    @NotBlank
    private String title;

    private String description;

    private LocalDateTime dueDate;

    private String priority; // High, Medium, Low

    private String status; // Completed, Pending

    private Boolean reminder = false;
    private LocalDateTime reminderTime;

    private String userId; // Reference to the User who owns the task

    @Transient
    private List<SubTask> subtasks = new ArrayList<>();

    // Feature counts (calculated at runtime)
    private long subtaskCount = 0;
    private long commentCount = 0;
    private long attachmentCount = 0;
    private long completedSubtaskCount = 0;
}
