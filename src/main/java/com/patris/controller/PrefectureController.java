package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.model.Prefecture;
import com.patris.service.PrefectureService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/prefecture")
@RequiredArgsConstructor
public class PrefectureController {

    private final PrefectureService service;

    @GetMapping
    public List<Prefecture> findAll(){
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Prefecture findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Prefecture> create(@RequestBody Prefecture prefecture){
        return ResponseEntity.ok(service.save(prefecture));
    }

    @PutMapping("/{id}")
    public Prefecture update(@PathVariable Long id, @RequestBody Prefecture prefecture){
        return service.update(id, prefecture);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Prefecture> delete(@PathVariable Long id){
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
