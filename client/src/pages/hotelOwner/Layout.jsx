import React, { useEffect } from 'react'
import Navbar from '../../components/hotelOwner/Navbar'
import Sidebar from '../../components/hotelOwner/Sidebar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'

const Layout = () => {

    const { isOwner, navigate } = useAppContext()

    useEffect(() => {
        if (!isOwner) {
            navigate('/')
        }
    }, [isOwner])

    return (
        <div className='flex flex-col h-screen overflow-hidden'>
            <Navbar />
            <div className='flex flex-1 overflow-hidden'>
                <Sidebar />
                <div className='flex-1 overflow-y-auto p-4 pt-10 md:px-10'>
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout