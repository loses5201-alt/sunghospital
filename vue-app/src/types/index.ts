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
  skillMatrix: SkillMatrix
  eduReads?: Record<string, Record<string, boolean>>
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
export interface Announcement {
  id: string; title: string; body: string; authorId: string
  time: string; pinned?: boolean
  category?: string; infectionLevel?: '' | 'yellow' | 'orange' | 'red'
  reads: Record<string, boolean>
}
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
export interface MeetingTask {
  id: string; title: string; status: '待辦' | '進行中' | '已完成'; priority?: string
  assigneeId?: string; dueDate?: string; note?: string
}
export interface MeetingChatMsg { id: string; userId: string; text: string; createdAt: string }
export interface VoteOption { id: string; text: string; votes: string[] }
export interface MeetingVote { id: string; question: string; options: VoteOption[]; closed?: boolean }
export interface Meeting {
  id: string; title: string; date: string; status: string
  attendeeIds: string[]; notes?: string; resolutions?: string[]
  tasks: MeetingTask[]; chat: MeetingChatMsg[]; votes: MeetingVote[]
  reads?: Record<string, { read: boolean; at?: string }>
  signoff?: { locked: boolean; signatures?: Record<string, string> }
}
export interface Message {
  id: string; roomId: string; from: string; to?: string; text?: string
  ts: string; deleted?: boolean; reads?: Record<string, boolean>
  reactions?: Record<string, string[]>
}
export interface ChatRoom {
  id: string; name?: string; members: string[]
  isGroup?: boolean; groupName?: string
  lastMsg?: string; lastTs?: string
}
export interface JournalComment { id: string; userId: string; text: string; createdAt: string; likes: string[] }
export interface Journal {
  id: string; userId: string; date: string; content: string
  title?: string; category?: string; createdAt?: string
  likes: string[]; comments: JournalComment[]
  pinned?: boolean; image?: string; edited?: boolean
}
export interface EduItem { id: string; title: string; icon?: string; tags: string[]; desc?: string; content?: string }
export interface Sop {
  id: string; title: string; category: string
  version?: string; content?: string
  updatedAt?: string; updatedBy?: string
  acks?: Record<string, string>
  steps?: string[]
}
export interface FormRequest {
  id: string; type: string; title: string; applicantId: string
  startDate?: string; endDate?: string; reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  approvers: string[]; statuses: string[]; comments?: string[]
  createdAt: string
}
export interface SwapRequest {
  id: string; fromId: string; toId: string; status: string; createdAt: string
  fromDate?: string; fromShift?: string; toDate?: string; toShift?: string; reason?: string
  requesterId?: string; targetId?: string
}
export interface FormNotif { id: string; toUserId: string; title: string; body: string; createdAt: string }
export interface SkillDef { id: string; name: string; category: string; requiresExpiry?: boolean }
export interface SkillCell { level: '' | 'certified' | 'trained' | 'learning'; expireDate: string; note: string; updatedAt: string }
export type SkillMatrix = Record<string, Record<string, SkillCell>>
export interface Title { id: string; name: string }
export interface Room { id: string; name: string; capacity: number }
export interface Emergency {
  id: string; title: string; body?: string; level: string
  authorId?: string; time?: string; createdAt?: string
  confirms: Record<string, boolean>
}
export interface Comment { id: string; userId: string; text: string; createdAt: string }
export interface Task { id: string; title: string; done: boolean; assigneeId?: string }
