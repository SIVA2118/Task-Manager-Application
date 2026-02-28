package com.taskmanager.repository;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.taskmanager.model.Attachment;

public interface AttachmentRepository extends MongoRepository<Attachment, String> {
    List<Attachment> findByTaskId(String taskId);
}
