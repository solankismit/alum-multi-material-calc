# Feature Implementation Workflow

Follow this structured approach to build a complete, production-ready feature. Each phase must be completed and validated before moving to the next.

---

## Phase 1: Planning

1. **Requirement Analysis**
   - Clearly understand the feature requirements.
   - Identify edge cases, constraints, and failure scenarios.
   - Define success criteria.

2. **Data Modeling**
   - Design or update the database schema if required.
   - Ensure normalization, indexing, and scalability considerations.

3. **API Design**
   - Define API endpoints (REST/GraphQL).
   - Specify request/response contracts and validation rules.
   - Consider authentication and authorization.

4. **Frontend Architecture**
   - Sketch component hierarchy.
   - Plan state management strategy.
   - Identify reusable components.

---

## Phase 2: Backend Development

1. **Database Implementation**
   - Create and run migrations.
   - Ensure backward compatibility.

2. **API Development**
   - Implement endpoints with strict validation.
   - Handle errors and edge cases properly.
   - Follow security best practices.

3. **Testing**
   - Write unit tests for business logic.
   - Cover edge cases and failure scenarios.


---

## Phase 3: Frontend Development

1. **Component Development**
   - Build reusable and maintainable React components.

2. **State Management**
   - Implement efficient and scalable state handling.

3. **API Integration**
   - Connect frontend to backend APIs.
   - Handle loading, success, and error states properly.

4. **UX & Responsiveness**
   - Ensure smooth user experience.
   - Make the UI fully responsive across devices.

---

## Phase 4: Finalization & Quality

1. **Integration Testing**
   - Validate end-to-end workflows.
   - Ensure frontend and backend work seamlessly together.

2. **Performance Optimization**
   - Identify and fix bottlenecks.
   - Optimize queries, rendering, and network usage.

4. **Documentation & Cleanup**
   - Refactor code where necessary.
   - Remove unused code and ensure consistency.

---

## Core Principle

- Work **incrementally**.
- Validate and test each phase before proceeding.
- Do not move forward with unresolved issues.