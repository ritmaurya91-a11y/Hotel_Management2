import React, { useState } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/Title'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'

const AddRoom = () => {

    const { axios, getToken } = useAppContext()

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [loading, setLoading] = useState(false);

    const [inputs, setInputs] = useState({
        roomType: '',
        pricePerNight: 0,
        amenities: {
            'Free WiFi': false,
            'Free Breakfast': false,
            'Room Service': false,
            'Mountain View': false,
            'Pool Access': false
        }
    })

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        // Check if all inputs are filled
        if (!inputs.roomType || !inputs.pricePerNight || !inputs.amenities || !Object.values(images).some(image => image)) {
            toast.error("Please fill in all the details")
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData()
            formData.append('roomType', inputs.roomType)
            formData.append('pricePerNight', inputs.pricePerNight)
            // Converting Amenities to Array & keeping only enabled Amenities
            const amenities = Object.keys(inputs.amenities).filter(key => inputs.amenities[key])
            formData.append('amenities', JSON.stringify(amenities))

            // Adding Images to FormData
            Object.keys(images).forEach((key) => {
                images[key] && formData.append('images', images[key])
            })

            const { data } = await axios.post('/api/rooms/', formData, { headers: { Authorization: `Bearer ${await getToken()}` } })

            if (data.success) {
                toast.success(data.message)
                setInputs({
                    roomType: '',
                    pricePerNight: 0,
                    amenities: {
                        'Free WiFi': false,
                        'Free Breakfast': false,
                        'Room Service': false,
                        'Mountain View': false,
                        'Pool Access': false
                    }
                })
                setImages({ 1: null, 2: null, 3: null, 4: null })
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='px-4 sm:px-6 md:px-8 py-4'>
            <form onSubmit={onSubmitHandler} className='max-w-3xl w-full mx-auto'>
                <Title align='left' font='outfit' title='Add Room' subTitle='Fill in the details carefully and accurate room details, pricing, and amenities, to enhance the user booking experience.' />
                {/* Upload Area For Images */}
                <p className='text-gray-800 mt-10'>Images</p>
                <div className='flex flex-wrap gap-4 my-2'>
                    {Object.keys(images).map((key) => (
                        <label key={key} htmlFor={`roomImage${key}`}>
                            <img className='w-32 h-32 object-cover rounded cursor-pointer opacity-80 border' src={images[key] ? URL.createObjectURL(images[key]) : assets.uploadArea} alt="" />
                            <input type="file" accept='image/*' id={`roomImage${key}`} hidden
                                onChange={e => setImages({ ...images, [key]: e.target.files[0] })} />
                        </label>
                    ))}
                </div>

                <div className='flex flex-col sm:flex-row gap-4 mt-4'>

                    <div className='flex-1'>
                        <p className='text-gray-800 mt-4'>Room Type</p>
                        <select className='border border-gray-300 mt-1 rounded p-2 w-full' value={inputs.roomType} onChange={(e) => setInputs({ ...inputs, roomType: e.target.value })}>
                            <option value=''>Select Room Type</option>
                            <option value='Single Bed'>Single Bed</option>
                            <option value='Double Bed'>Double Bed</option>
                            <option value='Luxury Room'>Luxury Room</option>
                            <option value='Family Suite'>Family Suite</option>
                        </select>
                    </div>

                    <div>
                        <p className='mt-4 text-gray-800'>Price <span className='text-xs'>/night</span></p>
                        <input type="number" placeholder='0' className='border border-gray-300 mt-1 rounded p-2 w-full' value={inputs.pricePerNight} onChange={(e) => setInputs({ ...inputs, pricePerNight: e.target.value })} />
                    </div>

                </div>

                <p className='text-gray-800 mt-6'>Amenities</p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 mt-2'>
                    {Object.keys(inputs.amenities).map((amenity, index) => (
                        <label key={index} className='flex items-center gap-2'>
                            <input type='checkbox' id={`amenities${index + 1}`} checked={inputs.amenities[amenity]}
                                onChange={() => setInputs({ ...inputs, amenities: { ...inputs.amenities, [amenity]: !inputs.amenities[amenity] } })}
                            />
                            <label htmlFor={`amenities${index + 1}`}> {amenity} </label>
                        </label>
                    ))}
                </div>

                <button className='bg-primary text-white px-6 py-2 rounded mt-8 cursor-pointer mb-5' disabled={loading}>
                    {loading ? "Adding..." : "Add Room"}
                </button>
            </form>
        </div>
    )
}

export default AddRoom
