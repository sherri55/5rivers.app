BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
	"id"	TEXT NOT NULL,
	"checksum"	TEXT NOT NULL,
	"finished_at"	DATETIME,
	"migration_name"	TEXT NOT NULL,
	"logs"	TEXT,
	"rolled_back_at"	DATETIME,
	"started_at"	DATETIME NOT NULL DEFAULT current_timestamp,
	"applied_steps_count"	INTEGER UNSIGNED NOT NULL DEFAULT 0,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "Company" (
	"companyId"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"email"	TEXT,
	"phone"	TEXT,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	PRIMARY KEY("companyId")
);
CREATE TABLE IF NOT EXISTS "Dispatcher" (
	"dispatcherId"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"email"	TEXT NOT NULL,
	"phone"	TEXT,
	"commissionPercent"	REAL NOT NULL,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	PRIMARY KEY("dispatcherId")
);
CREATE TABLE IF NOT EXISTS "Driver" (
	"driverId"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"email"	TEXT NOT NULL,
	"phone"	TEXT,
	"hourlyRate"	REAL NOT NULL,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	PRIMARY KEY("driverId")
);
CREATE TABLE IF NOT EXISTS "Unit" (
	"unitId"	TEXT NOT NULL,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	"color"	TEXT,
	"plateNumber"	TEXT,
	"vin"	TEXT,
	PRIMARY KEY("unitId")
);
CREATE TABLE IF NOT EXISTS "DriverRate" (
	"driverRateId"	TEXT NOT NULL,
	"driverId"	TEXT NOT NULL,
	"jobTypeId"	TEXT NOT NULL,
	"hourlyRate"	REAL,
	"percentageRate"	REAL,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	CONSTRAINT "DriverRate_jobTypeId_fkey" FOREIGN KEY("jobTypeId") REFERENCES "JobType"("jobTypeId") ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "DriverRate_driverId_fkey" FOREIGN KEY("driverId") REFERENCES "Driver"("driverId") ON DELETE RESTRICT ON UPDATE CASCADE,
	PRIMARY KEY("driverRateId")
);
CREATE TABLE IF NOT EXISTS "Invoice" (
	"invoiceId"	TEXT NOT NULL,
	"dispatcherId"	TEXT NOT NULL,
	"invoiceNumber"	TEXT NOT NULL,
	"invoiceDate"	DATETIME NOT NULL,
	"status"	TEXT NOT NULL DEFAULT 'Pending',
	"subTotal"	REAL,
	"dispatchPercent"	REAL,
	"commission"	REAL,
	"hst"	REAL,
	"total"	REAL,
	"billedTo"	TEXT,
	"billedEmail"	TEXT,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	CONSTRAINT "Invoice_dispatcherId_fkey" FOREIGN KEY("dispatcherId") REFERENCES "Dispatcher"("dispatcherId") ON DELETE RESTRICT ON UPDATE CASCADE,
	PRIMARY KEY("invoiceId")
);
CREATE TABLE IF NOT EXISTS "InvoiceLine" (
	"invoiceLineId"	TEXT NOT NULL,
	"invoiceId"	TEXT NOT NULL,
	"jobId"	TEXT NOT NULL,
	"lineAmount"	REAL NOT NULL DEFAULT 0,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	CONSTRAINT "InvoiceLine_jobId_fkey" FOREIGN KEY("jobId") REFERENCES "Job"("jobId") ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE RESTRICT ON UPDATE CASCADE,
	PRIMARY KEY("invoiceLineId")
);
CREATE TABLE IF NOT EXISTS "Job" (
	"jobId"	TEXT NOT NULL,
	"jobDate"	TEXT NOT NULL,
	"jobGrossAmount"	REAL,
	"jobTypeId"	TEXT,
	"driverId"	TEXT,
	"dispatcherId"	TEXT,
	"unitId"	TEXT,
	"invoiceId"	TEXT,
	"invoiceStatus"	TEXT NOT NULL DEFAULT 'Pending',
	"weight"	TEXT,
	"loads"	INTEGER,
	"startTime"	TEXT,
	"endTime"	TEXT,
	"ticketIds"	TEXT,
	"paymentReceived"	BOOLEAN NOT NULL DEFAULT false,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	CONSTRAINT "Job_driverId_fkey" FOREIGN KEY("driverId") REFERENCES "Driver"("driverId") ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "Job_jobTypeId_fkey" FOREIGN KEY("jobTypeId") REFERENCES "JobType"("jobTypeId") ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "Job_dispatcherId_fkey" FOREIGN KEY("dispatcherId") REFERENCES "Dispatcher"("dispatcherId") ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "Job_invoiceId_fkey" FOREIGN KEY("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "Job_unitId_fkey" FOREIGN KEY("unitId") REFERENCES "Unit"("unitId") ON DELETE SET NULL ON UPDATE CASCADE,
	PRIMARY KEY("jobId")
);
CREATE TABLE IF NOT EXISTS "JobType" (
	"jobTypeId"	TEXT NOT NULL,
	"title"	TEXT NOT NULL,
	"startLocation"	TEXT,
	"endLocation"	TEXT,
	"dispatchType"	TEXT NOT NULL,
	"rateOfJob"	REAL NOT NULL,
	"companyId"	TEXT,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	CONSTRAINT "JobType_companyId_fkey" FOREIGN KEY("companyId") REFERENCES "Company"("companyId") ON DELETE SET NULL ON UPDATE CASCADE,
	PRIMARY KEY("jobTypeId")
);
CREATE TABLE IF NOT EXISTS "User" (
	"userId" TEXT NOT NULL,
	"email" TEXT NOT NULL UNIQUE,
	"password" TEXT NOT NULL,
	"name" TEXT,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL,
	PRIMARY KEY("userId")
);
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count") VALUES ('b3e0280c-f2f6-40a7-a2e3-970c2494e26f','31f0734355a09f86b31032d28ac3be86fddf22678c173651ecfa63d730884701',1747263559373,'20250504083630_init',NULL,NULL,1747263559242,1);
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count") VALUES ('fb9006a0-2906-4a74-bea6-fa2985f45ee7','1892c72ecb8f4a28f5d964b6f4db877a5bcbee62ea01cf11a4ef628d5825f018',1747263559428,'20250504084856_add_unit_plate_color_vin',NULL,NULL,1747263559381,1);
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count") VALUES ('4032518a-392b-4469-8eee-29b4406d91a7','70ebebe265c920001d6c325e703e8d7ec75a8be1b00936c38e74965c0a82d701',1747263559468,'20250510042016_add_start_end_time_to_job',NULL,NULL,1747263559436,1);
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count") VALUES ('98b83e88-ebe0-41f8-99ff-467cccb0b8ea','74ed9855126c308dd94090855989d36a0f48d0a00d0da125a58a482d4e171dc3',1747263559517,'20250510042717_add_start_end_time_to_job',NULL,NULL,1747263559476,1);
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count") VALUES ('578d5657-ee5b-472a-afa8-e6ffebea6ce3','3d333198729026be76e79b866f9b42ca5c7f9fd3d29304010abb93c0b6dcbd24',1747263559566,'20250510141647_remove_job_name',NULL,NULL,1747263559525,1);
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count") VALUES ('027fa2b0-ffbd-47ec-a5e6-7caf8d7eee74','7a4bb41244919b61112ee14a6635a895a129aad855897be950cf4c37b35898cd',1747263592271,'20250514225952_add_ticket_ids_to_job',NULL,NULL,1747263592190,1);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('9a90fa68-d1ad-434b-843b-e6762b182499','214 Carson Co.',NULL,NULL,NULL,1745680286482,1745680286482);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('983e3aee-ddfb-402e-9b5a-6ca9e0b88b8f','Blythedale',NULL,NULL,NULL,1745845370911,1745845370911);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('09f258c4-aa5c-4324-bc90-fca3c0d61b5c','VP Top Soil',NULL,NULL,NULL,1745846229303,1745846229303);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('6781156e-20ee-4a26-b878-0a60e43dc950','VanBree',NULL,NULL,NULL,1745847368350,1745848943622);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('89d31846-e100-491f-b943-c48aacb6c9c6','Clintar',NULL,NULL,NULL,1745848949358,1745848949358);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('86fccc4a-db8e-455d-8bc2-a61a338c7d99','Elgin Construction',NULL,NULL,NULL,1745849545332,1745849545332);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('430c3ba2-9dae-499e-9990-cd06c1ad90d4','Sturdy''s',NULL,NULL,NULL,1745849565257,1745849565257);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('b565a573-8c24-4d8c-9b8e-771de54413ac','R. Russel Construction',NULL,NULL,NULL,1745849582135,1745849582135);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('dc6b8dbd-ea32-4a8a-a034-0faefcb5b66d','ASG Excavating',NULL,NULL,NULL,1745849592418,1745849592418);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('b8d372df-a33b-4384-ade8-923bd08029e1','VBI',NULL,NULL,NULL,1745849624571,1745849624571);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('3c14a0e0-7b55-4c6c-845b-909ac1a7a28f','Lifted',NULL,NULL,NULL,1745849655189,1745849655189);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('d537a850-b319-4127-9adc-c7f3dba84025','Edward & Sons',NULL,NULL,NULL,1745849670006,1745849670006);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('163324e6-99b3-4438-af2c-6b882a235870','Armstrong Construction',NULL,NULL,NULL,1746101775314,1746101775314);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('67fc5e77-adbc-4f47-a6c5-e2154389783f','Stubbe''s',NULL,NULL,NULL,1746101819876,1746101819876);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('d3fade0c-7f73-4982-8b05-2fbd8e16aa6b','GHN',NULL,NULL,NULL,1746626584008,1746626584008);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('bd099024-f21d-4f09-9044-8deec886eb63','Aarcon Construction','','unknown@gmail.com','',1747249622348,1747249622348);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('4faee77b-d35e-498d-8690-f58a09a2934c','Tridon','','unknown@gmail.com','',1747250051970,1747250051970);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('9e111ebf-16c6-40c9-8163-d43502074910','Drewlo','','unknown@gmail.com','',1747250500552,1747250500552);
INSERT INTO "Company" ("companyId","name","description","email","phone","createdAt","updatedAt") VALUES ('51e47c1c-bae9-43a7-9ee9-80590ff3759f','Birnam','','invoicing@birnam.ca','5198283449',1747253132609,1747253132609);
INSERT INTO "Dispatcher" ("dispatcherId","name","description","email","phone","commissionPercent","createdAt","updatedAt") VALUES ('56fcaea5-ebc4-4bda-8904-8a3b785c356d','Farmers Pride Haulage','','info@farmerspride.ca','+1 (519) 872-2770',5.0,1745678113669,1747246897681);
INSERT INTO "Dispatcher" ("dispatcherId","name","description","email","phone","commissionPercent","createdAt","updatedAt") VALUES ('e9563ca9-66ef-4fb1-88c9-0dccb25f9e19','Wroom Inc.',NULL,'wroomlogistics@gmail.com','+1 (226) 448-3227',5.0,1745678174170,1746221956521);
INSERT INTO "Dispatcher" ("dispatcherId","name","description","email","phone","commissionPercent","createdAt","updatedAt") VALUES ('bba40f44-2ccc-4396-8cd2-e1a118ed6463','Lucy''s',NULL,'lucystrucking@hotmail.com',NULL,0.0,1745678204919,1746221958824);
INSERT INTO "Dispatcher" ("dispatcherId","name","description","email","phone","commissionPercent","createdAt","updatedAt") VALUES ('8b5d40c9-c01b-4a2d-b658-500b401517f9','GCT Incorporation','114 Havelock Dr. Brampton, Ontario L6W 6E3','accounting@gctinc.co','+1 (437) 996-3585',0.0,1745841215741,1745841215741);
INSERT INTO "Dispatcher" ("dispatcherId","name","description","email","phone","commissionPercent","createdAt","updatedAt") VALUES ('b0c14596-9ddc-4a75-93ac-2a9eaca56c05','VehCAN Logistics','','vehcanlogistics@gmail.com','5198595135',5.0,1747250337131,1747250657761);
INSERT INTO "Driver" ("driverId","name","description","email","phone","hourlyRate","createdAt","updatedAt") VALUES ('dca9d5ba-a64a-4809-9f64-3e07751cb881','Amritinder Cheema',NULL,'amritindercheema@gmail.com','+1 (226) 700-5268',30.0,1745678239698,1745678239698);
INSERT INTO "Driver" ("driverId","name","description","email","phone","hourlyRate","createdAt","updatedAt") VALUES ('2784f384-7d36-477b-8631-7d543a15fd5b','Gurjot',NULL,'gjsagu@gmail.com','+1 (416) 986-7367',29.38,1745678284278,1745678284278);
INSERT INTO "Driver" ("driverId","name","description","email","phone","hourlyRate","createdAt","updatedAt") VALUES ('9a9d7bec-7a98-48c2-b77b-2e86b5495f28','Karan Arora',NULL,'karanarora9212110@gmail.com','+1 (226) 385-8799',28.0,1745678328018,1745845697302);
INSERT INTO "Driver" ("driverId","name","description","email","phone","hourlyRate","createdAt","updatedAt") VALUES ('783894b0-400d-4300-8348-e6e8205b90b3','Steve','Steve - Wroom','stevealf@hotmail.com',NULL,26.0,1745678402743,1745678402743);
INSERT INTO "Driver" ("driverId","name","description","email","phone","hourlyRate","createdAt","updatedAt") VALUES ('d7b6e7dc-680d-4d32-8b98-cd7c5266b947','Gurpreet Bhullar',NULL,'bhullar_gurpeet@outlook.com',NULL,28.0,1745845690856,1745845690856);
INSERT INTO "Driver" ("driverId","name","description","email","phone","hourlyRate","createdAt","updatedAt") VALUES ('2a49189f-2281-493f-9350-0f0c754761d8','Rajbir (BKT)',NULL,'rajbir@bkt.com',NULL,26.0,1745847698388,1745847698388);
INSERT INTO "Unit" ("unitId","name","description","createdAt","updatedAt","color","plateNumber","vin") VALUES ('6d93ea05-d0b1-4361-b89e-0d7a77a900cc','Unit 51','International HX620 - White',1745846229303,1745846229303,'White',NULL,NULL);
INSERT INTO "Unit" ("unitId","name","description","createdAt","updatedAt","color","plateNumber","vin") VALUES ('d8c0a938-f2e4-4ae3-a8cc-a0b2b666e4e1','Unit 52','Volvo VHD - Red',1745846229303,1745846229303,'Red','',NULL);
INSERT INTO "Unit" ("unitId","name","description","createdAt","updatedAt","color","plateNumber","vin") VALUES ('dccc00e0-ea39-4f4f-b57d-9ffb67bfb81c','Unit 402 (BKT)','',1745846229303,1745846229303,NULL,NULL,NULL);
INSERT INTO "Invoice" ("invoiceId","dispatcherId","invoiceNumber","invoiceDate","status","subTotal","dispatchPercent","commission","hst","total","billedTo","billedEmail","createdAt","updatedAt") VALUES ('1','56fcaea5-ebc4-4bda-8904-8a3b785c356d','INV-0001','2023-10-10 10:00:00','Pending',100.00,10.00,5.00,15.00,130.00,'John Doe','john.doe@example.com',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "InvoiceLine" ("invoiceLineId","invoiceId","jobId","lineAmount","createdAt","updatedAt") VALUES ('1','1','1',50.00,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "InvoiceLine" ("invoiceLineId","invoiceId","jobId","lineAmount","createdAt","updatedAt") VALUES ('2','1','2',50.00,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
-- Test user for authentication
INSERT INTO "User" ("userId", "email", "password", "name", "createdAt", "updatedAt")
VALUES ('dshamsher', 'dshamsher', 'Edy@1234', 'D. Shamsher', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
COMMIT;
