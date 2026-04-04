package com.patris.service;

import com.patris.model.User;
import com.patris.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository repository;

    public List<User> findAll() {
        return repository.findAll();
    }

    public User save(User entity) {
        return repository.save(entity);
    }
    
    // Ajoutez d'autres mÃ©thodes mÃ©tier ici
}
