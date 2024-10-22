import React, { useEffect, useState } from 'react';
import HomeClientComponent from '../client/homeClientComponent';
import { StateModelMap } from '../../server';
import FeedClientComponent from "../client/feedClientComponent";

export default function ServerServerComponent() {
    return <FeedClientComponent />
}
