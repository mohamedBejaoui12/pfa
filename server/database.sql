CREATE DATABASE pfa;

CREATE TABLE members (
    member_cin CHAR(8) PRIMARY KEY UNIQUE,
    fullname VARCHAR(255),
    member_etat BOOLEAN,
    grade VARCHAR(255) NOT NULL,
    admin BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    validate_from DATE,
    validate_to DATE
);
