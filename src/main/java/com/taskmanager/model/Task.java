package com.taskmanager.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

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
}
