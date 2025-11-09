import SideBar from "./sidebar"

interface Props {
    children: React.ReactNode
}

const AppWrapper = ({children}: Props) => {
    return (
        <div className="h-full">
            <SideBar />
            <main className = "lg:pl-10 h-full">
                {children}
            </main>
        </div>
    )
}

export default AppWrapper