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

CREATE TABLE meetings (
    created_by CHAR(8) NOT NULL,
    title VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    content VARCHAR,
    start_at TIMEStAMP NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE meetings
ADD COLUMN meeting_file BYTEA;

CREATE TABLE members_email (
    member_id CHAR(8) NOT NULL,
    email VARCHAR NOT NULL,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, email),
    FOREIGN KEY (member_id) REFERENCES members (member_cin) ON DELETE CASCADE
);
