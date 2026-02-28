package com.taskmanager.repository;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.taskmanager.model.SubTask;

public interface SubTaskRepository extends MongoRepository<SubTask, String> {
    List<SubTask> findByTaskId(String taskId);
}
