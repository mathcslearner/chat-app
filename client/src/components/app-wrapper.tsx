interface Props {
    children: React.ReactNode
}

const AppWrapper = ({children}: Props) => {
    return (
        <div className="h-full">
            <main className = "h-full">
                {children}
            </main>
        </div>
    )
}

export default AppWrapper