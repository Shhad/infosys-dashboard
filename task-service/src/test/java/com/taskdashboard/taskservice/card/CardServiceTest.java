package com.taskdashboard.taskservice.card;

import com.taskdashboard.taskservice.card.dto.CreateCardRequest;
import com.taskdashboard.taskservice.common.ApiException;
import com.taskdashboard.taskservice.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the role/ownership authorization matrix (SPEC §4.2, AC-5…AC-12).
 * Repository is mocked — no database needed; full stand-up is covered by verify.sh.
 */
@ExtendWith(MockitoExtension.class)
class CardServiceTest {

    @Mock
    private CardRepository repository;

    @InjectMocks
    private CardService service;

    private static final UUID ADMIN_ID = UUID.randomUUID();
    private static final UUID USER_A = UUID.randomUUID();
    private static final UUID USER_B = UUID.randomUUID();

    private static UserPrincipal admin() {
        return new UserPrincipal(ADMIN_ID, "ADMIN");
    }

    private static UserPrincipal user(UUID id) {
        return new UserPrincipal(id, "USER");
    }

    /** When repository.save is called, echo back the persisted entity. */
    private void echoOnSave() {
        when(repository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static ApiException asApiException(Throwable t) {
        assertThat(t).isInstanceOf(ApiException.class);
        return (ApiException) t;
    }

    @Nested
    @DisplayName("list (AC-5, AC-6)")
    class ListTests {

        @Test
        @DisplayName("ADMIN lists all cards")
        void adminListsAll() {
            Card c = new Card("t", null, Status.OPEN, USER_A, USER_A);
            when(repository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(c));

            assertThat(service.list(admin())).containsExactly(c);

            verify(repository).findAllByOrderByCreatedAtDesc();
            verify(repository, never()).findVisibleTo(any());
        }

        @Test
        @DisplayName("USER lists only cards visible to them (created-by or assigned-to)")
        void userListsVisibleOnly() {
            when(repository.findVisibleTo(USER_A)).thenReturn(List.of());

            service.list(user(USER_A));

            verify(repository).findVisibleTo(USER_A);
            verify(repository, never()).findAllByOrderByCreatedAtDesc();
        }
    }

    @Nested
    @DisplayName("create (AC-7, AC-8)")
    class CreateTests {

        @Test
        @DisplayName("USER: supplied assignee is ignored — creator and assignee forced to self")
        void userForcesSelf() {
            echoOnSave();
            CreateCardRequest req = new CreateCardRequest("Title", "desc", USER_B);

            Card created = service.create(user(USER_A), req);

            assertThat(created.getCreatorId()).isEqualTo(USER_A);
            assertThat(created.getAssigneeId()).isEqualTo(USER_A);
            assertThat(created.getStatus()).isEqualTo(Status.OPEN);
            assertThat(created.getTitle()).isEqualTo("Title");
        }

        @Test
        @DisplayName("ADMIN: creator is self, supplied assignee is honored")
        void adminHonorsAssignee() {
            echoOnSave();
            CreateCardRequest req = new CreateCardRequest("Title", null, USER_B);

            Card created = service.create(admin(), req);

            assertThat(created.getCreatorId()).isEqualTo(ADMIN_ID);
            assertThat(created.getAssigneeId()).isEqualTo(USER_B);
            assertThat(created.getStatus()).isEqualTo(Status.OPEN);
        }

        @Test
        @DisplayName("ADMIN: null assignee is allowed (unassigned card)")
        void adminNullAssignee() {
            echoOnSave();
            CreateCardRequest req = new CreateCardRequest("Title", null, null);

            Card created = service.create(admin(), req);

            assertThat(created.getCreatorId()).isEqualTo(ADMIN_ID);
            assertThat(created.getAssigneeId()).isNull();
        }
    }

    @Nested
    @DisplayName("changeStatus (AC-9, AC-10, AC-11)")
    class ChangeStatusTests {

        @Test
        @DisplayName("USER changes status of own-created card")
        void userChangesOwn() {
            Card card = new Card("t", null, Status.OPEN, USER_A, USER_A);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));
            echoOnSave();

            Card result = service.changeStatus(user(USER_A), card.getId(), "IN_PROGRESS");

            assertThat(result.getStatus()).isEqualTo(Status.IN_PROGRESS);
        }

        @Test
        @DisplayName("invalid status value → 400 (AC-11), before any ownership check")
        void invalidStatusIs400() {
            UUID anyId = UUID.randomUUID();

            Throwable t = org.junit.jupiter.api.Assertions.assertThrows(
                    ApiException.class,
                    () -> service.changeStatus(user(USER_A), anyId, "BOGUS"));

            assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
            // parsing fails first → repository is never touched
            verifyNoInteractions(repository);
        }

        @Test
        @DisplayName("null status value → 400")
        void nullStatusIs400() {
            assertThatThrownBy(() -> service.changeStatus(user(USER_A), UUID.randomUUID(), null))
                    .isInstanceOf(ApiException.class)
                    .satisfies(t -> assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        }

        @Test
        @DisplayName("USER cannot change status of a card they did not create → 403")
        void userOtherCardForbidden() {
            Card card = new Card("t", null, Status.OPEN, USER_B, USER_B);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));

            assertThatThrownBy(() -> service.changeStatus(user(USER_A), card.getId(), "DONE"))
                    .satisfies(t -> assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

            verify(repository, never()).save(any());
        }

        @Test
        @DisplayName("being only an assignee does NOT grant edit rights → 403 (AC-10, AC-12)")
        void assigneeIsNotEditor() {
            // created by B, assigned to A; A is USER and tries to edit
            Card card = new Card("t", null, Status.OPEN, USER_B, USER_A);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));

            assertThatThrownBy(() -> service.changeStatus(user(USER_A), card.getId(), "DONE"))
                    .satisfies(t -> assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        }

        @Test
        @DisplayName("ADMIN changes status of any card")
        void adminChangesAny() {
            Card card = new Card("t", null, Status.OPEN, USER_A, USER_A);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));
            echoOnSave();

            Card result = service.changeStatus(admin(), card.getId(), "REVIEW");

            assertThat(result.getStatus()).isEqualTo(Status.REVIEW);
        }

        @Test
        @DisplayName("missing card → 404")
        void missingCardIs404() {
            UUID missing = UUID.randomUUID();
            when(repository.findById(missing)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.changeStatus(user(USER_A), missing, "DONE"))
                    .satisfies(t -> assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        }
    }

    @Nested
    @DisplayName("changeAssignee")
    class ChangeAssigneeTests {

        @Test
        @DisplayName("ADMIN reassigns any card")
        void adminReassigns() {
            Card card = new Card("t", null, Status.OPEN, USER_A, USER_A);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));
            echoOnSave();

            Card result = service.changeAssignee(admin(), card.getId(), USER_B);

            assertThat(result.getAssigneeId()).isEqualTo(USER_B);
        }

        @Test
        @DisplayName("USER cannot reassign a card they did not create → 403")
        void userOtherCardForbidden() {
            Card card = new Card("t", null, Status.OPEN, USER_B, USER_B);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));

            assertThatThrownBy(() -> service.changeAssignee(user(USER_A), card.getId(), USER_A))
                    .satisfies(t -> assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

            verify(repository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("delete")
    class DeleteTests {

        @Test
        @DisplayName("USER deletes own-created card")
        void userDeletesOwn() {
            Card card = new Card("t", null, Status.OPEN, USER_A, USER_A);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));

            service.delete(user(USER_A), card.getId());

            ArgumentCaptor<Card> captor = ArgumentCaptor.forClass(Card.class);
            verify(repository).delete(captor.capture());
            assertThat(captor.getValue().getId()).isEqualTo(card.getId());
        }

        @Test
        @DisplayName("USER cannot delete a card they did not create → 403")
        void userOtherCardForbidden() {
            Card card = new Card("t", null, Status.OPEN, USER_B, USER_B);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));

            assertThatThrownBy(() -> service.delete(user(USER_A), card.getId()))
                    .satisfies(t -> assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

            verify(repository, never()).delete(any());
        }

        @Test
        @DisplayName("ADMIN deletes any card")
        void adminDeletesAny() {
            Card card = new Card("t", null, Status.OPEN, USER_A, USER_A);
            when(repository.findById(card.getId())).thenReturn(Optional.of(card));

            service.delete(admin(), card.getId());

            verify(repository).delete(card);
        }

        @Test
        @DisplayName("delete missing card → 404")
        void missingCardIs404() {
            UUID missing = UUID.randomUUID();
            when(repository.findById(missing)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.delete(user(USER_A), missing))
                    .satisfies(t -> assertThat(asApiException(t).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        }
    }
}
