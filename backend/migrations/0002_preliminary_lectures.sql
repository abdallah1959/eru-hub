-- Preliminary import from the currently available Level 1 lecture schedule PDFs.
-- Every record is marked needs_review; do not expose it publicly until an admin confirms it.
INSERT OR IGNORE INTO courses (id, code, name_ar, name_en, status) VALUES
('course-cs101','CS101','مقدمة في علوم الحاسب','Introduction to Computer Science','needs_review'),
('course-is101','IS101','أساسيات نظم المعلومات','Fundamentals of Information Systems','needs_review'),
('course-mth101','MTH101','رياضيات 1','Mathematics 1','needs_review'),
('course-mth103','MTH103','الجبر الخطي','Linear Algebra','needs_review'),
('course-ph101','PH101','الفيزياء','Physics','needs_review'),
('course-hm001','HM001','اللغة الإنجليزية 1','English Language 1','needs_review');

INSERT OR IGNORE INTO rooms (id, building, floor, room_code, name_ar, name_en, status) VALUES
('room-hall-100',NULL,NULL,'Hall 100','قاعة 100','Hall 100','needs_review'),
('room-hall-311',NULL,NULL,'Hall 311','قاعة 311','Hall 311','needs_review'),
('room-hall-g00',NULL,NULL,'Hall G00','قاعة G00','Hall G00','needs_review');

INSERT OR IGNORE INTO sessions
(id, course_id, day_of_week, start_time, end_time, session_type, section_code, room_id, instructor, status, notes)
VALUES
('lecture-a-cs101','course-cs101',0,'12:00','13:30','lecture','A','room-hall-100','Mahmoud Khalid','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-a-mth101','course-mth101',0,'13:30','15:00','lecture','A','room-hall-100','Mohamed Labib','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-a-mth103','course-mth103',1,'09:00','10:30','lecture','A','room-hall-311','Islam Sobhi','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-a-hm001','course-hm001',1,'12:00','13:30','lecture','A','room-hall-g00','Fayez','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-a-ph101','course-ph101',3,'09:00','10:30','lecture','A','room-hall-100','Amira Mofreh','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-a-is101','course-is101',4,'13:30','15:00','lecture','A','room-hall-g00','Asmaa Kamal','needs_review','Preliminary PDF import; verify before publishing'),

('lecture-b-is101','course-is101',0,'10:30','12:00','lecture','B','room-hall-311','Mohamed Behairy','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-b-mth101','course-mth101',0,'12:00','13:30','lecture','B','room-hall-311','Mohamed Labib','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-b-mth103','course-mth103',1,'10:30','12:00','lecture','B','room-hall-311','Islam Sobhi','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-b-ph101','course-ph101',2,'12:00','13:30','lecture','B','room-hall-311','Dina Ezzat','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-b-hm001','course-hm001',3,'10:30','12:00','lecture','B','room-hall-g00','Fayez','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-b-cs101','course-cs101',4,'09:00','10:30','lecture','B','room-hall-100','Magdi','needs_review','Preliminary PDF import; verify before publishing'),

('lecture-c-is101','course-is101',0,'09:00','10:30','lecture','C','room-hall-311','Mohamed Behairy','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-c-ph101','course-ph101',2,'13:30','15:00','lecture','C','room-hall-311','Dina Ezzat','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-c-mth103','course-mth103',3,'09:00','10:30','lecture','C','room-hall-311','Islam Sobhi','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-c-mth101','course-mth101',3,'10:30','12:00','lecture','C','room-hall-100','Mohamed Labib','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-c-hm001','course-hm001',3,'12:00','13:30','lecture','C','room-hall-g00','Fayez','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-c-cs101','course-cs101',4,'12:00','13:30','lecture','C','room-hall-311','Magdi','needs_review','Preliminary PDF import; verify before publishing'),

('lecture-d-is101','course-is101',1,'13:30','15:00','lecture','D','room-hall-311','Mohamed Behairy','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-d-ph101','course-ph101',2,'09:00','10:30','lecture','D','room-hall-311','Dina Ezzat','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-d-hm001','course-hm001',3,'09:00','10:30','lecture','D','room-hall-g00','Fayez','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-d-mth103','course-mth103',3,'10:30','12:00','lecture','D','room-hall-311','Islam Sobhi','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-d-mth101','course-mth101',3,'12:00','13:30','lecture','D','room-hall-311','Mohamed Labib','needs_review','Preliminary PDF import; verify before publishing'),
('lecture-d-cs101','course-cs101',4,'13:30','15:00','lecture','D','room-hall-311','Magdi','needs_review','Preliminary PDF import; verify before publishing');
