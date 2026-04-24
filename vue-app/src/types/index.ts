export interface User {
  id: string
  username: string
  name: string
  email: string
  googleId?: string
  role: 'admin' | 'manager' | 'member'
  deptId: string
  title: string
  avatar: string
  password?: string
}

export interface AppStore {
  _savedAt?: number
  users: User[]
  departments: Department[]
  shifts: Shift[]
  leaves: Leave[]
  announcements: Announcement[]
  incidents: Incident[]
  babies: Baby[]
  patients: Patient[]
  equipment: Equipment[]
  inventory: InventoryItem[]
  inventoryLogs: InventoryLog[]
  meetings: Meeting[]
  messages: Message[]
  chatRooms: ChatRoom[]
  journals: Journal[]
  eduItems: EduItem[]
  sops: Sop[]
  formRequests: FormRequest[]
  swapRequests: SwapRequest[]
  formNotifs: FormNotif[]
  skillDefs: SkillDef[]
  titles: Title[]
  rooms: Room[]
  emergencies: Emergency[]
}

export interface Department { id: string; name: string; color?: string }
export interface Shift { id: string; userId: string; date: string; type: string; note?: string }
export interface Leave {
  id: string; userId: string; type: string
  startDate: string; endDate: string; status: string; createdAt: string
}
export interface Announcement { id: string; title: string; body: string; createdAt: string; authorId: string }
export interface Incident {
  id: string; title: string; description: string
  level: string; status: string; comments: Comment[]
}
export interface Baby {
  id: string; name: string; birthDate: string; gender: string
  apgar1?: number; apgar5?: number; gestAge?: string; deliveryMethod?: string; feedMethod?: string
}
export interface Patient { id: string; name: string; deptId: string; admitDate: string; note?: string }
export interface Equipment {
  id: string; name: string; category: string; priority: string
  location: string; note: string; status: string; comments: Comment[]
}
export interface InventoryItem { id: string; name: string; category: string; stock: number; minStock: number; unit: string }
export interface InventoryLog { id: string; itemId: string; type: string; qty: number; date: string; userId: string }
export interface Meeting {
  id: string; title: string; date: string; status: string
  tasks: Task[]; chat: ChatMsg[]; votes: Vote[]
}
export interface Message { id: string; roomId: string; userId: string; text: string; createdAt: string }
export interface ChatRoom { id: string; name: string; members: string[] }
export interface Journal { id: string; userId: string; date: string; content: string }
export interface EduItem { id: string; title: string; category: string; content: string; authorId: string; createdAt: string }
export interface Sop { id: string; title: string; category: string; steps: string[]; authorId: string }
export interface FormRequest { id: string; type: string; title: string; applicantId: string; startDate: string; endDate: string; reason: string; status: string; createdAt: string }
export interface SwapRequest { id: string; requesterId: string; targetId: string; status: string; createdAt: string }
export interface FormNotif { id: string; toUserId: string; title: string; body: string; createdAt: string }
export interface SkillDef { id: string; name: string; category: string }
export interface Title { id: string; name: string }
export interface Room { id: string; name: string; capacity: number }
export interface Emergency { id: string; title: string; level: string; createdAt: string }
export interface Comment { id: string; userId: string; text: string; createdAt: string }
export interface Task { id: string; title: string; done: boolean; assigneeId?: string }
export interface ChatMsg { id: string; userId: string; text: string; createdAt: string }
export interface Vote { id: string; question: string; options: VoteOption[] }
export interface VoteOption { id: string; text: string; votes: string[] }
