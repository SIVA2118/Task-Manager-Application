package com.taskmanager.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "workouts")
public class Workout {
    @Id
    private String id;
    private String userId;
    private String name;
    private Integer duration; // In minutes
    private LocalDateTime date = LocalDateTime.now();
}
