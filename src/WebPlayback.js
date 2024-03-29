import React, { useRef, useState, useEffect } from 'react';
import './WebPlayback.css';
import { pre_webplayer, transferPlayback, play_playlist } from './pre_webplayer.js';
import Spinner from './Spinner.js';
import TopBar from './TopBar.js'



/**
 * 
 * @function WebPlayback
 * @functiondesc This component is responsible for the playback of 
 * the playlist in the browser. It uses the Spotify Web Playback SDK 
 * to play the playlist in the browser. 
 */
export default function WebPlayback(props) {
    const [is_paused, setPaused] = useState(false);
    const [is_active, setActive] = useState(false);
    const [player, setPlayer] = useState(undefined);
    const [current_track, setTrack] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [gotTracks, setGotTracks] = useState(false);
    const [tracksToRemove, setTracksToRemove] = useState([]);
    const [deletionStatus, setDeletionStatus] = useState("");
    const [counter, setCounter] = useState(0);
    const num_tracks = props.track_list.length;
    //initialize counter to 0
    useEffect(() => {
        setCounter(0);
    }, [props.track_list]);
    useEffect(() => {
        // Initialize Spotify player here
        pre_webplayer(props, player, setPlayer, setTrack, setActive, setDeviceId, setPaused);
        return () => {
            if (player) {
                player.disconnect();
            }
        }
    }, [props.track_list]);
    //disconnect the player when the component is unmounted, and pasue player when left
    useEffect(() => {
        // Function to pause the Spotify player
        console.log("player", player);
        const pausePlayer = () => {
            if (player) {
                player.disconnect();
                console.log('Playback paused');
            }
        };

        // Add event listener for beforeunload event
        window.addEventListener('beforeunload', pausePlayer);

        // Cleanup function to remove the event listener
        return () => {
            window.removeEventListener('beforeunload', pausePlayer);
            if (player) {
                player.pause();
            }
        };
    }, [player, props.track_list]);
    //transfer the user playback
    useEffect(() => {
        transferPlayback(props, deviceId);
    }, [deviceId, props.track_list])
    //play the playlist from the counter
    useEffect(() => {
        play_playlist(props, setGotTracks, setTrack, deviceId, counter, setPaused, is_paused);
    }, [deviceId, props.token, props.track_list]);
    //handle button functionality
    const handleClick = (action) => {
        if (!player) return;
        switch (action) {
            case 'remove':
                let updatedTrackToRemove = [...tracksToRemove];
                console.log(tracksToRemove[tracksToRemove.length - 1]?.id == current_track.id);
                if (tracksToRemove[tracksToRemove.length - 1]?.id == current_track.id) {
                    break;
                }
                updatedTrackToRemove.push(current_track);
                setTracksToRemove(updatedTrackToRemove);
            case 'keep':
                setCounter(prevCounter => prevCounter + 1);
                play_playlist(props, setGotTracks, setTrack, deviceId, (counter + 1) % num_tracks, setPaused, is_paused);
                break;
            case 'undo':
                // implement functional undo button stuff
                {
                    if (counter == 0) {
                        break;
                    }
                    play_playlist(props, setGotTracks, setTrack, deviceId, (counter - 1) % num_tracks, setPaused, is_paused);
                    let updatedTrackToRemove = [...tracksToRemove];
                    let recentlyRemoved = updatedTrackToRemove.pop();

                    if (counter >= 0 && props.track_list[(counter - 1) % num_tracks]?.id == recentlyRemoved?.id) {
                        setTracksToRemove(updatedTrackToRemove);
                    }
                    if (counter > 0) {
                        setCounter(prevCounter => prevCounter - 1);
                    }
                    break; // <- Add this break statement
                }
            case 'toggle':
                is_paused ? player.resume() : player.pause();
                setPaused(!is_paused);
                break;
        }
    };

    //confirm deletion
    const confirmDelete = async () => {
        // DELETED 

        setDeletionStatus("Deleting...");

        let ids_to_remove = tracksToRemove.map((track) => track.id);
        const response = await fetch('http://localhost:8000/remove_tracks?' + new URLSearchParams({
            playlist_id: props.playlist_id,
            track_ids: ids_to_remove
        }), { method: 'DELETE' });

        setTracksToRemove([]);
        setDeletionStatus("Changes confirmed.");
    }
    //Add keypress functionality
    useEffect(() => {
        // Define handleKeyPress inside useEffect or after handleClick if handleClick is outside useEffect
        const handleKeyPress = (event) => {
            switch (event.key) {
                case 'ArrowRight':
                    handleClick('keep');
                    break;
                case 'ArrowLeft':
                    handleClick('undo');
                    break;
                case 'Backspace':
                    handleClick('remove');
                    break;
                case ' ':
                    event.preventDefault();
                    handleClick('toggle');
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [current_track, handleClick]); // handleClick dependency is now valid
    //handle the selection form the dropdown
    const handleSelection = (selectedValue) => {
        const selectedIndex = props.track_list.findIndex(track => track.id === selectedValue);
        console.log("Here");
        setCounter(selectedIndex);
        play_playlist(props, setGotTracks, setTrack, deviceId, selectedIndex, setPaused, is_paused);
    }

    if (!is_active || !gotTracks || !current_track) {
        return <Spinner />;
    }

    return (
        <>
            <TopBar/>
            <div className='sidebar'>
                <div className='deleted-tracks-list'>
                    <h2>Deleted Tracks</h2>
                    {tracksToRemove.map((item, index) => (
                        <div key={index} className="deleted-track">
                            <div className="track-container">
                                {/* <button className="remove-track-btn"> 
                                x
                            </button> */}
                                <span>{item.name} - {item.artists[0].name}</span>
                            </div>
                        </div>
                    ))}
                    {tracksToRemove.length > 0 && (
                        <button className='confirm-btn' onClick={confirmDelete}>Confirm</button>
                    )}
                </div>
                <div>
                    {deletionStatus}
                </div>
            </div>
            
            <div className='right-sidebar'>
                <div className='tracks-heading'>
                    <h2 className='right-align' >Tracks</h2>
                    <select className="tracks-dropdown" onChange={(event) => handleSelection(event.target.value)}>
                        {props.track_list.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </div>
                <div className='artists-heading'>
                    <h2 className='right-align'>Artists</h2>
                    {/* Place the ArtistDropdown component here once it's ready */}
                    {/* Example: <ArtistDropdown artists={props.artists} /> */}
                </div>
            </div>

            <div className="container">
                <div className="main-wrapper">
                    <div className="playlist-name">{props.playlist_name}</div>
                    <img src={current_track?.album?.images[0]?.url} className="album-img" alt="" />
                    <div className="now-playing">
                        <div className="now-playing__name">{current_track?.name}</div>
                        <div className="now-playing__artist">{current_track?.artists[0]?.name}</div>
                        <button className="spotify-btn" onClick={() => handleClick('remove')}>
                            <i className="fas fa-trash"></i>
                        </button>
                        <button className='spotify-btn' onClick={() => handleClick('undo')}>
                            <i className="fas fa-undo"></i>
                        </button>
                        <button className="spotify-btn" onClick={() => handleClick('toggle')}>
                            {is_paused ? <i className="fas fa-play"></i> : <i className="fas fa-pause"></i>}
                        </button>
                        <button className="spotify-btn" onClick={() => handleClick('keep')}>
                            <i className="fas fa-arrow-right"></i>
                        </button>
                        <ProgressBar current={counter} total={num_tracks} />

                    </div>
                </div>
            </div>
        </>
    );
};


const ProgressBar = (props) => {
    let { current, total } = props;
    current > total ? current = total : null;
    let percent = (current) / total * 100;
    percent = percent.toFixed(2); // Rounds to 2 decimal places


    const containerStyles = {
        border: 'solid',
        height: 20,
        width: '100%',
        backgroundColor: "#212121",
        margin: '50px 0px',
        borderRadius: 20,
        borderColor: '#f0f8ff',
    }

    const fillerStyles = {
        height: '100%',
        width: `${percent}%`,
        backgroundColor: '#f0f8ff',
        textAlign: 'right',
        borderRadius: 'inherit'
    }

    const labelStyles = {
        padding: 5,
        color: '#212121',
        fontWeight: 'bold'
    }

    const noAlign = {
        textAlign: 'left',
        width: '100%',
        margin: 5
    }

    return (
        <div style={containerStyles}>
            <div style={fillerStyles}>
                <span style={labelStyles}></span>
            </div>
            <div style={noAlign} className='deleted-tracks-list'>Progress: {current} / {total}</div>
        </div>
    );
};

