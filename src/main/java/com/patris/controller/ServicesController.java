package com.patris.controller;

import com.patris.model.Services;
import com.patris.service.ServicesService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServicesController {

    private final ServicesService servicesService;

    @GetMapping
    public List<Services> findAll() {
        return servicesService.findAll();
    }

    @GetMapping("/{id}")
    public Services findById(@PathVariable Long id){
        return servicesService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Services> save(@RequestBody Services services) {
        return ResponseEntity.ok(servicesService.save(services));
    }

    @PutMapping("/{id}")
    public Services update(@PathVariable Long id, @RequestBody Services service){
        return servicesService.update(id, service);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Services> delete(@PathVariable Long id){
        servicesService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
