// ─── Shared Trip Data ─────────────────────────────────────────────────────────
// Single source of truth for trip types + static data.
// When backend is connected, replace TRIPS with an API fetch keyed on tripId.

export type TripStatus = 'APPROVED' | 'IN REVIEW' | 'DRAFT' | 'CANCELLED';

export interface TripMember {
    name: string;
    avatarUrl: string;
}

export interface Trip {
    id: string;
    title: string;
    client: string;
    status: TripStatus;
    dateRange: string;
    budget: string;
    members: TripMember[];
}

export const TRIPS: Trip[] = [
    {
        id: 'TR-8821',
        title: 'Paris Culinary Tour',
        client: 'Sarah Johnson',
        status: 'APPROVED',
        dateRange: 'OCT 12 – OCT 18, 2024',
        budget: '$4,250.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-6Q-m1Yo1xNKThTwAoqzJHkTjZ2n9DxeX1y5nHORtWJExhyngqZWrGMC9QzHM1popP6riZjuzprWGcMsKyatuQekZVTX6h5pqySZK5D04rI5xRwAuNFDZMxz_ylWQfOuGsBVQ9aV1liKt5Mln7PE6BUhW84bKBhBkC_id19_CpkqmTY6GOxETuIQyKKPRos_Hk3xthcHnAffFzLE-nxUiUSSkB6OzVA7KBYHDnFv2mVAybp3p4GbsmW5vB7YeFtP822R9jT6UGG-K' },
            { name: 'Client', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeWW6TNDao-VTWwcYqrdYyfvdR-xhgiQ3OHTgNWfAaCliKxda13XQOApFaApOtjFHGDRbDh7LBuhQf7GwSJOjFedkG91Ku6wcICiSrZ-WF3PteBJDSQMqZQWZnqbUCtO_gnhxWQqkjtIfIV1ZkfvQ9Qka-RB5SUUsimP48ldZhk89nJ3M2xuXu4oMl_d04WjJ1svccHB3vHC7KTiN3oS05qnCibBG6tAkcWzkcZo3MhkJsAUM2_7Scd6yaQERCINJp470KxpzDYfkg' },
        ],
    },
    {
        id: 'TR-9023',
        title: 'Tokyo Tech Summit',
        client: 'TechGlobal Corp',
        status: 'IN REVIEW',
        dateRange: 'NOV 05 – NOV 12, 2024',
        budget: '$12,800.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBr15CL18LcOloEVDOaNnMuszemDsJ1wXWlFmo9t63LLVm2Vg9_AJya-XTrd39XxZ_2p5ERWcbL-eek4n9gJqjXfmo5Lhxg8Cla6eeZ3uc4tE3MpvAI3DmAmbDagUJYD6079_xxCzjJOKkapiqdg_tpDirFTOCtEQHd-Mij_FWMoxpiNiBnV2d9VToFQkcyj0oJo7t6HztZQLyY2h2xTs3uvlpk-WdP9crCyYGHuSnQOqOXuRDqrceqrtb-E0RIedj2AsmWMFDrHOr' },
        ],
    },
    {
        id: 'TR-1102',
        title: 'Amalfi Coast Retreat',
        client: 'Elena Rossi',
        status: 'DRAFT',
        dateRange: 'JUN 15 – JUN 25, 2025',
        budget: '$8,500.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApatcBA28QVBYFOtlp_sjVklzWLUR8EYR08jcF1jK4lDgml93-ol14S45aIGUmBFeY_FfEVbMAABnktnSpz6HNpsMukYYGrx-EU2yjPrvENM_KWli79M6eR85DZEc83B9rde680HCwa54FNVzoA5aLRytz2YpkG3TrzJ6s4IIEnJPV8vpVD0GVzUH1WRpjGLeK6DUC-3Tdv0EOjbYaWGkmXHDZpDl3TfRxAYEUI23-KX9s7tYDtKWhRN2J91o2ooYmyVQm-6BPxBA5' },
            { name: 'Client', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeXa4igoZ9JWVPAaCTMfZtsCO27PFVwQQ1JDRQmtreKRZlT-3QHx1qlLkn3LPf_7ou-4AGIId-nznhJavthD_WMBJBTLCjqKWy_9uPb9Bos2GuaSEwHv9LYevlUUggk2yISDZScsfMz2cLx1JJYOGVcowQlfymXaFjN51FldhHFhJP-war93huoMLNiYNqwXj2Skogt5Pi6mARCtQPTfSnXS3HGSITqSFCuCAvWzEtuc8rqGC-B5-xbA3rsxeN5PFiBsIB9gYgOVJo' },
        ],
    },
    {
        id: 'TR-9941',
        title: 'Kyoto Cherry Blossom',
        client: 'James Morrison',
        status: 'IN REVIEW',
        dateRange: 'MAR 28 – APR 05, 2025',
        budget: '$6,200.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDR_3g7sOGo8ylyWEw4G6JJzY4aDKA7aK5ydkuphXNCKVTLdtquVHq0W6ufgbInUxKIwjROH9LOe5xqiQAF57raHH6KaO9ZTV4ZARDuDuBjRbEokSVxBB8pjQQDB3VxNZOKoSSGVKp87lCstm2-yr1z0OXJ5hz25iYdDkJT3Z8K1G8PFRn_xqApHFn_Qk1RFcYRAiFcwjyE8dR6cjk8ABOCGeMJ2Prd1bRgEsEdx2vxdqax_OoYpDu1jvG5a7rWGRKxMjHuDkg8jFla' },
        ],
    },
    {
        id: 'TR-7622',
        title: 'New York City Escape',
        client: 'The Smith Family',
        status: 'APPROVED',
        dateRange: 'DEC 20 – DEC 27, 2024',
        budget: '$15,400.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMcePAHdHONgBzDficd3XZ8YYiUMragZo5Lrpb3FWCCeCy6FgnHrDZECfzb8CNg9EvvSgKpDPmabKiu9f2ZRCdR24lKGzInZZBHyqni6XAbEw-OewEH6sjbBq_izURdPjHZuU46y7RQrtAssuu0bGtME7KxrJwjM9KOQu4xvJYAWRJnV7FWnsG22_eNHSOvF_XktZP3EoaVxNT2VatWDNLMbf8lKmYLJn7TNZnbzxqHQEVNjkjkHa6FzUQyYTJO0XzvF611OefCUTt' },
            { name: 'Client', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH9fJLuwY5h3GW5CoVUklAC9-wqcOalteakJNUC7oMv9ov0Hm_ic1XuEIlC8n6I5juKnzfb5qfevQbSYPxlcMFhqZrFdSHzpABgDPhUutMnapBP67fxXhmfqONaLlshoalsfNsmgeeyRs1yZtV9qEIFUtp6wE-4sFGP13vn0UqB5w8a6ox-8WMKd2PtZXmnZq_jR8bdU0qxZY12bNTzkYx9CI0Ix6xRcz2Tyf-sUyLVWf0rvJSuq_dIGjavVb9f7kIcvDHnPtilCzc' },
        ],
    },
    {
        id: 'TR-5510',
        title: 'Bali Digital Nomad',
        client: 'Mark Davidson',
        status: 'CANCELLED',
        dateRange: 'JAN 10 – FEB 10, 2025',
        budget: '$3,200.00 EST',
        members: [
            { name: 'Agent', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQtBOSVwxgyRxBnAXZwJt8Q0-mDDUu_16Br1LpYbmLNDCws59MhNVsPD4Kl-TsrTtCYCXHM1rr6dSGEqBiRNd1qqYk74_4p5Gysk_tLyflALUJkYquQzvdCrQAwL8ISNe3iZ2HWRGJjMWX4zxMB5cxkQLdQXt5vtJ2Uvs6xPOUGP4odMLPQjXPDFB5VuS_4wLXncgFMPPgV2bF3ZVgbe0Jws5zLIK5e8nfrCKLLM1kgtbhCjamTvJJcC4K_OR4uWcB0yTIpOClqCod' },
        ],
    },
];

/** Look up a trip by its ID. Returns undefined if not found. */
export function getTripById(id: string): Trip | undefined {
    return TRIPS.find((t) => t.id === id);
}
