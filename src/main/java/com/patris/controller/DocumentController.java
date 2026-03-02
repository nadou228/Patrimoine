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

import com.patris.model.Document;
import com.patris.service.DocumentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/document")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService service;
    
    @GetMapping
    public List<Document> findAll(){
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Document findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Document> create(@RequestBody Document document){
        return ResponseEntity.ok(service.save(document));
    }

    @PutMapping("/{id}")
    public Document update(@PathVariable Long id, @RequestBody Document document){
        return service.update(id, document);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Document> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

}
