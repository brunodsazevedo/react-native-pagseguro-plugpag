# Feature Specification: Abort Operation

**Feature Branch**: `feature/012-abort-operation`
**Created**: 2026-04-30
**Status**: Draft
**Origin**: [Issue #11](https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/11)

## Overview

Operators using PagBank SmartPOS terminals occasionally need to cancel an in-progress terminal
operation — most commonly when the terminal is waiting for the customer to insert or tap their
card. Today, there is no way to cancel this from the application layer; the only option is to
wait up to 2 minutes for the terminal's natural timeout. This feature adds two cancellation
functions to the library so that applications can abort any in-progress operation immediately
on demand.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator Cancels a Waiting Terminal Operation (Priority: P1)

A cashier initiates a payment on a PagBank SmartPOS terminal. The terminal enters a state
waiting for the customer to present their card. The customer changes their mind or leaves
the queue. The cashier presses "Cancel" in the application. The application calls the abort
function, and the terminal immediately cancels the waiting state, returning control to the
operator within seconds — without waiting for the 2-minute timeout.

**Why this priority**: This is the primary motivation for the feature. Waiting up to 2 minutes
for a timeout is an unacceptable operator experience and blocks the terminal from being used
for other customers.

**Independent Test**: Can be fully tested by initiating a payment, triggering an abort while
the terminal displays "waiting for card", and verifying that the terminal returns to idle state
promptly with a definitive response to the caller.

**Acceptance Scenarios**:

1. **Given** a terminal operation is in progress (e.g., payment waiting for card), **When** the abort function is called, **Then** it resolves successfully with a confirmation that the abort was acknowledged by the terminal.
2. **Given** a terminal operation is in progress, **When** the abort function is called but the terminal does not acknowledge, **Then** it rejects with a specific abort-failure error, distinct from other error types.
3. **Given** no terminal operation is in progress, **When** the abort function is called, **Then** it returns a definitive response (success or error) — it never hangs indefinitely.

---

### User Story 2 - Application Detects an Operator-Cancelled Payment (Priority: P2)

A developer builds a POS application that handles payment errors. When a payment is aborted
by the operator, the application must distinguish this from a genuine payment failure (e.g.,
declined card, connectivity error) so it can show the appropriate message: "Payment cancelled
by operator" vs. "Payment declined — please try again."

**Why this priority**: Without the ability to distinguish cancellations from failures, the
application cannot provide accurate feedback to the operator, leading to confusion and
incorrect next steps.

**Independent Test**: Can be fully tested by initiating a payment, calling abort, observing
that the payment rejects with a specific identifiable code, and verifying that this code differs
from any other payment error code.

**Acceptance Scenarios**:

1. **Given** a payment is in progress and abort is called, **When** the payment operation completes (rejects), **Then** the rejection carries an identifiable code that the application can compare against a documented constant.
2. **Given** the library is imported, **When** the developer checks the exported constants, **Then** a constant for "operation aborted" is available for use in payment error-handling logic.

---

### User Story 3 - iOS Platform Guard (Priority: P3)

A developer builds an application that targets both Android and iOS. The abort functions are
called within shared business logic. On iOS, since the terminal SDK is not available, the
functions must reject immediately with a clear error message rather than crashing or
hanging silently.

**Why this priority**: The library is Android-only, but applications may be built for multiple
platforms. Silent failures or crashes on iOS would degrade developer experience and make
cross-platform development harder.

**Independent Test**: Can be fully tested by calling the abort functions on an iOS simulator
and verifying that a clear, recognizable error is returned immediately.

**Acceptance Scenarios**:

1. **Given** the application is running on iOS, **When** any abort function is called, **Then** it rejects immediately with an error whose message contains the library prefix `[react-native-pagseguro-plugpag] ERROR:` and the name of the called function.

---

### Edge Cases

- **Concurrent abort calls**: If abort is called multiple times while the terminal has not yet responded to the first call, only the first call is sent to the terminal. All callers receive the same result when the terminal responds — no duplicate signals are sent.
- What happens when abort is called immediately after a payment resolves (race condition)?
- What happens when the underlying terminal service throws an unexpected exception during abort?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The library MUST expose a synchronous abort function that cancels any in-progress terminal operation and waits for terminal acknowledgement before resolving.
- **FR-002**: The library MUST expose an asynchronous abort function that cancels any in-progress terminal operation and notifies the caller through the native SDK listener mechanism.
- **FR-003**: Both abort functions MUST resolve with a success indicator when the terminal acknowledges the cancellation.
- **FR-004**: Both abort functions MUST reject with a specific, identifiable abort-failure error when the terminal does not acknowledge the cancellation.
- **FR-005**: Both abort functions MUST reject with an internal error when an unexpected exception occurs before or during the cancellation process.
- **FR-006**: The library MUST export a constant representing the error code produced by an in-progress payment when aborted, so consuming applications can distinguish operator cancellations from other payment failures.
- **FR-007**: Both abort functions MUST be scoped to Android only; calls on iOS MUST reject immediately with a descriptive error message containing the library identifier prefix and the function name.
- **FR-008**: The abort capability MUST apply to any type of in-progress terminal operation — payment, refund, and activation — not just payment.

### Key Entities

- **AbortResult**: Represents the outcome of an abort request. On success, carries a fixed confirmation value. On failure, carries an error code and a human-readable message.
- **OperationAbortedCode**: A constant numeric value produced by the terminal when a payment operation is cancelled mid-flow. Used by consuming applications to classify payment rejections.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can cancel a waiting terminal operation within 5 seconds, compared to the current maximum wait of 2 minutes — a reduction of over 95% in worst-case cancellation time.
- **SC-002**: 100% of abort calls receive a definitive response — either a success confirmation or a specific error — within the terminal's normal response window; no call ever hangs indefinitely.
- **SC-003**: App developers can identify an operator-cancelled payment using a single constant comparison, without parsing error message strings.
- **SC-004**: The abort capability works across all supported terminal operation types (payment, refund, activation) without requiring separate functions per operation type.
- **SC-005**: Both abort variants (synchronous and asynchronous) are documented without preference; consuming applications choose based on their own threading and UX requirements.

## Clarifications

### Session 2026-04-30

- Q: What should happen when abort is called multiple times before the terminal acknowledges the first call? → A: Only the first call is forwarded to the terminal; subsequent concurrent calls share the same terminal response without sending additional signals.
- Q: Which abort variant (synchronous or asynchronous) should be recommended to library consumers? → A: Both variants are functionally equivalent for this use case; no official recommendation is made — the choice is left entirely to the consuming application.

## Assumptions

- The abort functions apply globally to the active terminal operation; there is no need to specify which operation to abort.
- Calling abort when no operation is in progress produces a definitive response (likely a failure acknowledgement from the terminal); this is acceptable behaviour.
- The calling application is responsible for updating its own UI state and deciding whether to retry after a successful or failed abort.
- Automatic retry logic is out of scope; consumers decide their own retry strategy.
- NFC-specific abort variants (`abortNFC` / `asyncAbortNFC`) are explicitly out of scope for this feature.
- iOS support is explicitly out of scope per the library's design constraints; the guard must be present but is not a functional path.
- Only Android terminals in the PagBank SmartPOS line are supported (A920, A930, P2, S920, GPOS780).
