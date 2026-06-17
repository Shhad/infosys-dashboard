package com.taskdashboard.taskservice.card;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CardRepository extends JpaRepository<Card, UUID> {

    /**
     * USER visibility (SPEC §4.2): cards created by OR assigned to the caller.
     */
    @Query("SELECT c FROM Card c WHERE c.creatorId = :me OR c.assigneeId = :me ORDER BY c.createdAt DESC")
    List<Card> findVisibleTo(@Param("me") UUID me);

    List<Card> findAllByOrderByCreatedAtDesc();
}
