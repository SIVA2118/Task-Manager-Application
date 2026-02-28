package com.taskmanager.repository;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.taskmanager.model.Workout;

public interface WorkoutRepository extends MongoRepository<Workout, String> {
    List<Workout> findByUserId(String userId);
}
