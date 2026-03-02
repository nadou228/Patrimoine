package com.patris.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.patris.model.Document;

public interface DocumentRepository extends JpaRepository<Document, Long> {

}
