import dynamic from 'next/dynamic'

const MapWithNoSSR = dynamic(() => import('../components/Map'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
})

export default function Home() {
  return (
    <main>
      <MapWithNoSSR />
    </main>
  )
}
