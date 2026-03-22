-- Migration 004: Add Expenses tables (ExpenseCategories + Expenses)

-- Expense Categories
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExpenseCategories')
BEGIN
  CREATE TABLE ExpenseCategories (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(36) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500) NULL,
    color NVARCHAR(20) NULL,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ExpenseCategories_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE
  );
  CREATE INDEX IX_ExpenseCategories_organizationId ON ExpenseCategories(organizationId);
END;

-- Expenses
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Expenses')
BEGIN
  CREATE TABLE Expenses (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(36) NOT NULL,
    categoryId VARCHAR(36) NULL,
    description NVARCHAR(500) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    expenseDate DATE NOT NULL,
    vendor NVARCHAR(255) NULL,
    paymentMethod NVARCHAR(50) NOT NULL DEFAULT 'OTHER',
    reference NVARCHAR(500) NULL,
    notes NVARCHAR(MAX) NULL,
    recurring BIT NOT NULL DEFAULT 0,
    recurringFrequency NVARCHAR(20) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Expenses_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
    CONSTRAINT FK_Expenses_Category FOREIGN KEY (categoryId) REFERENCES ExpenseCategories(id) ON DELETE SET NULL,
    CONSTRAINT CK_Expenses_paymentMethod CHECK (paymentMethod IN ('CASH','CHECK','BANK_TRANSFER','E_TRANSFER','CREDIT_CARD','OTHER')),
    CONSTRAINT CK_Expenses_recurringFrequency CHECK (recurringFrequency IS NULL OR recurringFrequency IN ('WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY'))
  );
  CREATE INDEX IX_Expenses_organizationId ON Expenses(organizationId);
  CREATE INDEX IX_Expenses_categoryId ON Expenses(categoryId);
  CREATE INDEX IX_Expenses_expenseDate ON Expenses(expenseDate);
END;
