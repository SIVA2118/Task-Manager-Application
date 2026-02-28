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
@Document(collection = "attachments")
public class Attachment {
    @Id
    private String id;
    private String taskId;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private LocalDateTime createdAt = LocalDateTime.now();
}
