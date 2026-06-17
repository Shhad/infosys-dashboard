package com.taskdashboard.taskservice.card;

import com.taskdashboard.taskservice.card.dto.CreateCardRequest;
import com.taskdashboard.taskservice.common.ApiException;
import com.taskdashboard.taskservice.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Card CRUD plus the role/ownership authorization matrix (SPEC §4.2).
 */
@Service
public class CardService {

    private final CardRepository repository;

    public CardService(CardRepository repository) {
        this.repository = repository;
    }

    /** GET /api/cards — ADMIN sees all; USER sees own-created OR assigned. */
    @Transactional(readOnly = true)
    public List<Card> list(UserPrincipal caller) {
        return caller.isAdmin()
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findVisibleTo(caller.id());
    }

    /**
     * POST /api/cards. USER: creator and assignee forced to self (any supplied
     * assignee ignored — AC-7). ADMIN: creator is self, assignee honored (AC-8).
     */
    @Transactional
    public Card create(UserPrincipal caller, CreateCardRequest req) {
        UUID assignee = caller.isAdmin() ? req.assigneeId() : caller.id();
        Card card = new Card(req.title(), req.description(), Status.OPEN, caller.id(), assignee);
        return repository.save(card);
    }

    /** PATCH /status — any valid enum value; ADMIN any card, USER only own-created. */
    @Transactional
    public Card changeStatus(UserPrincipal caller, UUID id, String rawStatus) {
        Status status = parseStatus(rawStatus);
        Card card = requireEditable(caller, id);
        card.setStatus(status);
        return repository.save(card);
    }

    /** PATCH /assignee — ADMIN any card, USER only own-created. */
    @Transactional
    public Card changeAssignee(UserPrincipal caller, UUID id, UUID assigneeId) {
        Card card = requireEditable(caller, id);
        card.setAssigneeId(assigneeId);
        return repository.save(card);
    }

    /** DELETE — ADMIN any card, USER only own-created. */
    @Transactional
    public void delete(UserPrincipal caller, UUID id) {
        Card card = requireEditable(caller, id);
        repository.delete(card);
    }

    private Status parseStatus(String raw) {
        try {
            return Status.valueOf(raw);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw ApiException.badRequest("Invalid status: " + raw);
        }
    }

    /**
     * Loads the card and enforces edit rights: ADMIN may edit any; USER may edit
     * only cards they created. Being merely an assignee does not grant edit
     * rights (AC-10, AC-12). Missing card → 404.
     */
    private Card requireEditable(UserPrincipal caller, UUID id) {
        Card card = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Card not found: " + id));
        if (!caller.isAdmin() && !card.getCreatorId().equals(caller.id())) {
            throw ApiException.forbidden("Not allowed to modify this card");
        }
        return card;
    }
}
