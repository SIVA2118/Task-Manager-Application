package com.taskmanager.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.taskmanager.model.Workout;
import com.taskmanager.repository.WorkoutRepository;
import com.taskmanager.security.services.UserDetailsImpl;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    @Autowired
    WorkoutRepository workoutRepository;

    private String getCurrentUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

    @GetMapping
    public ResponseEntity<List<Workout>> getAllWorkouts() {
        System.out.println("DEBUG: Fetching all workouts for user ID: " + getCurrentUserId());
        return new ResponseEntity<>(workoutRepository.findByUserId(getCurrentUserId()), HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<Workout> createWorkout(@RequestBody Workout workout) {
        workout.setUserId(getCurrentUserId());
        return new ResponseEntity<>(workoutRepository.save(workout), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteWorkout(@PathVariable String id) {
        workoutRepository.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
