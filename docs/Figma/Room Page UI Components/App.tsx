import { RoomPage } from './components/RoomPage'

export default function App() {
  return (
    <div className='size-full'>
      <RoomPage roomId='ABC123' isOrganizer={true} />
    </div>
  )
}
