package com.taskdashboard.taskservice.card;

import com.taskdashboard.taskservice.card.dto.CardResponse;
import com.taskdashboard.taskservice.card.dto.CreateCardRequest;
import com.taskdashboard.taskservice.card.dto.UpdateAssigneeRequest;
import com.taskdashboard.taskservice.card.dto.UpdateStatusRequest;
import com.taskdashboard.taskservice.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    private final CardService service;

    public CardController(CardService service) {
        this.service = service;
    }

    @GetMapping
    public List<CardResponse> list(@AuthenticationPrincipal UserPrincipal caller) {
        return service.list(caller).stream().map(CardResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CardResponse create(@AuthenticationPrincipal UserPrincipal caller,
                               @Valid @RequestBody CreateCardRequest req) {
        return CardResponse.from(service.create(caller, req));
    }

    @PatchMapping("/{id}/status")
    public CardResponse changeStatus(@AuthenticationPrincipal UserPrincipal caller,
                                     @PathVariable UUID id,
                                     @Valid @RequestBody UpdateStatusRequest req) {
        return CardResponse.from(service.changeStatus(caller, id, req.status()));
    }

    @PatchMapping("/{id}/assignee")
    public CardResponse changeAssignee(@AuthenticationPrincipal UserPrincipal caller,
                                       @PathVariable UUID id,
                                       @RequestBody UpdateAssigneeRequest req) {
        return CardResponse.from(service.changeAssignee(caller, id, req.assigneeId()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal caller, @PathVariable UUID id) {
        service.delete(caller, id);
    }
}
