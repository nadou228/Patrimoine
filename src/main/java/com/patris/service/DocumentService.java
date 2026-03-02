package com.patris.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.patris.model.Bien;
import com.patris.model.Document;
import com.patris.repository.BienRepository;
import com.patris.repository.DocumentRepository;

@Service
public class DocumentService {
    
    @Autowired
    private final DocumentRepository repository;
    private final BienRepository bienRepository;

    public DocumentService(DocumentRepository repository, BienRepository bienRepository){
        this.repository = repository;
        this.bienRepository = bienRepository;
    }

    public List<Document> findAll(){
        return repository.findAll();
    }

    public Document findById(Long id){
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Document introuvalable"));
    }

    public Document save(Document document){
        Long bienId = document.getBien().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        document.setBien(bien);
        return repository.save(document);
    }

    public Document update(Long id, Document d){
        Document document = findById(id);
        document.setNomFichier(d.getNomFichier());
        document.setTypeDocument(d.getTypeDocument());
        document.setDateUpload(d.getDateUpload());
        document.setCheminFichier(d.getCheminFichier());

        return repository.save(document);
    }

    public void delete(Long id){
        repository.deleteById(id);
    }

}
