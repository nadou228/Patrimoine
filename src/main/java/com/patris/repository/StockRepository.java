package com.patris.repository;

import com.patris.model.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    Stock findByConsommableId(Long consommableId);

} 
