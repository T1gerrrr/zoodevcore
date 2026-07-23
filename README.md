# ZOO Workshop - Hệ Thống Chấm Công

Hệ thống chấm công và quản lý nhân viên cửa hàng, hỗ trợ PC và Mobile.

## Tính năng

- ✅ **Chấm công bằng GPS + Camera** - Nhân viên check-in/out với ảnh selfie và xác minh vị trí
- ✅ **Quản lý nhân viên** - CRUD nhân viên, setup lịch làm việc
- ✅ **Thống kê Dashboard** - Tổng quan chấm công theo ngày/tuần/tháng
- ✅ **Thông báo tự động** - Nhận thông báo khi nhân viên đủ ngày chấm công
- ✅ **Phân quyền** - Staff (quản lý) và Employee (nhân viên)
- ✅ **Responsive** - Hoạt động trên PC và Mobile

## Tech Stack

- **Frontend**: React.js (Vite)
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Image Storage**: Cloudinary
- **Geolocation**: Browser Geolocation API

## Cài đặt

### 1. Cấu hình Firebase

1. Tạo project trên [Firebase Console](https://console.firebase.google.com)
2. Bật Authentication (Email/Password)
3. Tạo Firestore Database
4. Tải service account key

### 2. Cấu hình Cloudinary

1. Tạo tài khoản [Cloudinary](https://cloudinary.com)
2. Lấy Cloud Name, API Key, API Secret

### 3. Environment Variables

Tạo file `.env` trong thư mục gốc (copy từ `.env.example`):

```bash
cp .env.example .env
```

Điền các thông tin cấu hình.

### 4. Chạy Server

```bash
cd server
npm install
npm run dev
```

Server sẽ chạy trên `http://localhost:5000`

### 5. Chạy Client

```bash
cd client
npm install
npm run dev
```

Client sẽ chạy trên `http://localhost:3000`

### 6. Setup Staff Account (lần đầu)

Sau khi tạo tài khoản trên Firebase Auth, gọi API để đăng ký là staff:

```bash
curl -X POST http://localhost:5000/api/auth/setup-staff \
  -H "Content-Type: application/json" \
  -d '{"uid": "firebase-uid", "email": "admin@zooworkshop.com", "name": "Admin"}'
```

## Cấu trúc thư mục

```
├── client/          # React Frontend (Vite)
│   └── src/
│       ├── hooks/       # useGeolocation, useCamera
│       ├── layouts/     # MainLayout (sidebar/bottom nav)
│       ├── lib/         # Firebase config
│       ├── pages/       # All page components
│       ├── services/    # API layer (axios)
│       └── store/       # Auth & Toast context
│
├── server/          # Node.js Backend (Express)
│   ├── controllers/     # Business logic
│   ├── middleware/       # Auth, error handling
│   ├── routes/          # API routes
│   ├── services/        # Firebase, Cloudinary, Notifications
│   └── utils/           # Geolocation, Date helpers
│
├── .env.example     # Environment variables template
└── .gitignore
```
